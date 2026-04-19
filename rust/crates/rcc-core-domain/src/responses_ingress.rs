use std::error::Error;
use std::fmt::{self, Display, Formatter};

use serde_json::{json, Value};

use crate::{project_responses_shell_continuation, RequestEnvelope, ResponseEnvelope};

pub const DEFAULT_RESPONSES_OPERATION: &str = "responses";

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ResponsesIngressError {
    message: String,
}

impl ResponsesIngressError {
    fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
        }
    }
}

impl Display for ResponsesIngressError {
    fn fmt(&self, f: &mut Formatter<'_>) -> fmt::Result {
        f.write_str(&self.message)
    }
}

impl Error for ResponsesIngressError {}

pub fn normalize_responses_ingress_body(body: &str) -> Result<Value, ResponsesIngressError> {
    if body.trim().is_empty() {
        return Ok(json!({}));
    }

    let value: Value = serde_json::from_str(body).map_err(|error| {
        ResponsesIngressError::new(format!("invalid JSON body for /v1/responses: {error}"))
    })?;

    if !value.is_object() {
        return Err(ResponsesIngressError::new(
            "invalid /v1/responses body: top-level JSON must be an object",
        ));
    }

    Ok(value)
}

pub fn build_responses_request_envelope(
    body: &str,
) -> Result<(RequestEnvelope, Value), ResponsesIngressError> {
    let payload = normalize_responses_ingress_body(body)?;
    let operation = payload
        .get("operation")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or(DEFAULT_RESPONSES_OPERATION);

    Ok((
        RequestEnvelope::new(operation, payload.to_string()),
        payload,
    ))
}

pub fn serialize_responses_shell(request: &Value, response: &ResponseEnvelope) -> Value {
    let continuity = project_responses_shell_continuation(request, &response.raw_provider_response);

    json!({
        "id": continuity.response_id.unwrap_or_else(|| "resp_skeleton".to_string()),
        "object": "response",
        "request_id": continuity.request_id,
        "previous_response_id": continuity.previous_response_id,
        "status": response.status,
        "model": request.get("model").cloned().unwrap_or(Value::Null),
        "output": [
            {
                "type": "message",
                "role": "assistant",
                "content": [
                    {
                        "type": "output_text",
                        "text": response.payload,
                    }
                ]
            }
        ],
        "route": {
            "target_block": response.route.target_block,
            "selected_route": response.route.selected_route,
            "selected_target": response.route.selected_target,
            "candidate_routes": response.route.candidate_routes,
        },
        "tool_plan": {
            "scheduled": response.tool_plan.scheduled,
        },
        "provider_runtime": response.provider_runtime,
        "required_action": response.required_action,
    })
}

#[cfg(test)]
mod tests {
    use serde_json::{json, Value};

    use crate::{ResponseEnvelope, RouteDecision, ToolPlan};

    use super::{
        build_responses_request_envelope, normalize_responses_ingress_body,
        serialize_responses_shell, DEFAULT_RESPONSES_OPERATION,
    };

    #[test]
    fn normalize_responses_ingress_body_defaults_empty_to_object() {
        let value = normalize_responses_ingress_body("").expect("empty body");
        assert_eq!(value, json!({}));
    }

    #[test]
    fn normalize_responses_ingress_body_requires_object() {
        let error = normalize_responses_ingress_body(r#"["not","object"]"#)
            .expect_err("array body should fail");

        assert!(error
            .to_string()
            .contains("top-level JSON must be an object"));
    }

    #[test]
    fn build_responses_request_envelope_defaults_operation_to_responses() {
        let (request, payload) =
            build_responses_request_envelope(r#"{"model":"gpt-5","input":"继续执行"}"#)
                .expect("request envelope");

        assert_eq!(request.operation, DEFAULT_RESPONSES_OPERATION);
        assert_eq!(payload["model"], "gpt-5");
        assert_eq!(payload["input"], "继续执行");
    }

    #[test]
    fn build_responses_request_envelope_keeps_explicit_operation() {
        let (request, payload) =
            build_responses_request_envelope(r#"{"operation":"responses.custom","model":"gpt-5"}"#)
                .expect("request envelope");

        assert_eq!(request.operation, "responses.custom");
        assert_eq!(payload["model"], "gpt-5");
    }

    #[test]
    fn serialize_responses_shell_builds_minimal_response_shape() {
        let value = serialize_responses_shell(
            &json!({"model":"gpt-5"}),
            &ResponseEnvelope {
                route: RouteDecision {
                    target_block: "pipeline".to_string(),
                    selected_route: Some("default".to_string()),
                    selected_target: Some("openai.primary.gpt-5".to_string()),
                    candidate_routes: vec!["default".to_string()],
                },
                tool_plan: ToolPlan::empty(),
                provider_runtime: "noop-runtime",
                status: "completed".to_string(),
                payload: "runtime=noop-runtime operation=responses".to_string(),
                required_action: Value::Null,
                raw_provider_response: Value::Null,
            },
        );

        assert_eq!(value["id"], "resp_skeleton");
        assert_eq!(value["object"], "response");
        assert_eq!(value["status"], "completed");
        assert_eq!(value["model"], "gpt-5");
        assert_eq!(value["route"]["target_block"], "pipeline");
        assert_eq!(value["route"]["selected_route"], "default");
        assert_eq!(value["route"]["selected_target"], "openai.primary.gpt-5");
        assert_eq!(value["route"]["candidate_routes"][0], "default");
        assert_eq!(value["provider_runtime"], "noop-runtime");
        assert_eq!(
            value["output"][0]["content"][0]["text"],
            "runtime=noop-runtime operation=responses"
        );
    }

    #[test]
    fn serialize_responses_shell_projects_continuity_from_raw_response_body() {
        let value = serialize_responses_shell(
            &json!({"model":"gpt-5"}),
            &ResponseEnvelope {
                route: RouteDecision {
                    target_block: "pipeline".to_string(),
                    selected_route: None,
                    selected_target: None,
                    candidate_routes: Vec::new(),
                },
                tool_plan: ToolPlan::empty(),
                provider_runtime: "transport-runtime",
                status: "requires_action".to_string(),
                payload: "继续执行".to_string(),
                required_action: json!({
                    "submit_tool_outputs": {
                        "tool_calls": [{"id":"call_resp_1","name":"exec_command"}]
                    }
                }),
                raw_provider_response: json!({
                    "body": {
                        "id": "resp_shell_1",
                        "request_id": "req_shell_1",
                        "previous_response_id": "resp_prev_1"
                    }
                }),
            },
        );

        assert_eq!(value["id"], "resp_shell_1");
        assert_eq!(value["request_id"], "req_shell_1");
        assert_eq!(value["previous_response_id"], "resp_prev_1");
    }

    #[test]
    fn serialize_responses_shell_projects_previous_response_id_from_request_fallback() {
        let value = serialize_responses_shell(
            &json!({"model":"gpt-5","previous_response_id":"resp_prev_req_1"}),
            &ResponseEnvelope {
                route: RouteDecision {
                    target_block: "pipeline".to_string(),
                    selected_route: None,
                    selected_target: None,
                    candidate_routes: Vec::new(),
                },
                tool_plan: ToolPlan::empty(),
                provider_runtime: "transport-runtime",
                status: "completed".to_string(),
                payload: "done".to_string(),
                required_action: Value::Null,
                raw_provider_response: json!({
                    "body": {
                        "id": "resp_shell_2"
                    }
                }),
            },
        );

        assert_eq!(value["id"], "resp_shell_2");
        assert_eq!(value["previous_response_id"], "resp_prev_req_1");
    }

    #[test]
    fn serialize_responses_shell_projects_submit_response_id_as_previous_response_id_fallback() {
        let value = serialize_responses_shell(
            &json!({"model":"gpt-5","response_id":"resp_submit_1"}),
            &ResponseEnvelope {
                route: RouteDecision {
                    target_block: "pipeline".to_string(),
                    selected_route: None,
                    selected_target: None,
                    candidate_routes: Vec::new(),
                },
                tool_plan: ToolPlan::empty(),
                provider_runtime: "transport-runtime",
                status: "completed".to_string(),
                payload: "done".to_string(),
                required_action: Value::Null,
                raw_provider_response: json!({
                    "body": {
                        "id": "resp_shell_submit_1"
                    }
                }),
            },
        );

        assert_eq!(value["id"], "resp_shell_submit_1");
        assert_eq!(value["previous_response_id"], "resp_submit_1");
    }
}
