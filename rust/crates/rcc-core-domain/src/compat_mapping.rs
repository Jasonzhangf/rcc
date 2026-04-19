use serde_json::{json, Map, Value};

use crate::{
    compat_request_projection::build_request_projection_for_target,
    hub_mapping_ops::protocol_mapping_audit_to_value, HubCanonicalOutboundRequest,
    ProtocolMappingAudit, ProviderRouteHandoff, RequestEnvelope, RouteDecision,
};

pub const ANTHROPIC_MESSAGES_OPERATION: &str = "anthropic-messages";
pub const GEMINI_CHAT_OPERATION: &str = "gemini-chat";

#[derive(Debug, Clone, PartialEq)]
pub struct CompatCanonicalRequest {
    pub operation: String,
    pub model: Option<String>,
    pub input: Option<Value>,
    pub messages: Vec<Value>,
    pub stream: Option<bool>,
    pub metadata: Value,
    pub payload: Value,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ProviderRequestCarrier {
    pub operation: String,
    pub body: Value,
    pub metadata: Value,
    pub route: Option<ProviderRouteHandoff>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ProviderResponseCarrier {
    pub runtime: String,
    pub status: String,
    pub body: Value,
    pub headers: Value,
    pub raw_stream_carrier: Value,
}

#[derive(Debug, Clone, PartialEq)]
pub struct CompatCanonicalResponse {
    pub response_id: Option<String>,
    pub status: String,
    pub output: Value,
    pub required_action: Value,
    pub raw_carrier: Value,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CompatProjectionError {
    message: String,
}

impl CompatProjectionError {
    fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
        }
    }
}

impl std::fmt::Display for CompatProjectionError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.message)
    }
}

impl std::error::Error for CompatProjectionError {}

pub fn normalize_compat_request_payload(payload: &str) -> Value {
    let trimmed = payload.trim();
    if trimmed.is_empty() {
        return json!({});
    }

    serde_json::from_str(trimmed).unwrap_or_else(|_| Value::String(trimmed.to_string()))
}

pub fn normalize_compat_canonical_request(request: &RequestEnvelope) -> CompatCanonicalRequest {
    let payload = normalize_compat_request_payload(&request.payload);
    let metadata = payload
        .get("metadata")
        .filter(|value| value.is_object())
        .cloned()
        .unwrap_or_else(|| json!({}));
    let messages = payload
        .get("messages")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();

    CompatCanonicalRequest {
        operation: request.operation.trim().to_string(),
        model: payload
            .get("model")
            .and_then(Value::as_str)
            .map(str::to_string),
        input: payload.get("input").cloned(),
        messages,
        stream: payload.get("stream").and_then(Value::as_bool),
        metadata,
        payload,
    }
}

pub fn build_provider_request_carrier(
    canonical: &CompatCanonicalRequest,
    route: Option<&RouteDecision>,
) -> ProviderRequestCarrier {
    let mut body = Map::new();

    if let Some(model) = &canonical.model {
        body.insert("model".to_string(), Value::String(model.clone()));
    }

    if let Some(input) = &canonical.input {
        body.insert("input".to_string(), input.clone());
    }

    if !canonical.messages.is_empty() {
        body.insert(
            "messages".to_string(),
            Value::Array(canonical.messages.clone()),
        );
    }

    if let Some(stream) = canonical.stream {
        body.insert("stream".to_string(), Value::Bool(stream));
    }

    if !metadata_is_empty(&canonical.metadata) {
        body.insert("metadata".to_string(), canonical.metadata.clone());
    }

    if body.is_empty() {
        body.insert("payload".to_string(), canonical.payload.clone());
    }

    ProviderRequestCarrier {
        operation: canonical.operation.clone(),
        body: Value::Object(body),
        metadata: canonical.metadata.clone(),
        route: build_provider_route_handoff(route),
    }
}

pub fn build_provider_request_carrier_from_canonical_outbound(
    outbound: &HubCanonicalOutboundRequest,
    route: Option<&RouteDecision>,
) -> Result<ProviderRequestCarrier, CompatProjectionError> {
    match trimmed_non_empty(outbound.target_provider_id.as_deref()) {
        Some("responses") | Some("openai") | Some("openai-standard") => {
            Ok(build_responses_provider_request_carrier(outbound, route)?)
        }
        Some("anthropic") | Some("gemini") => {
            let target_provider = outbound
                .target_provider_id
                .as_deref()
                .expect("target provider already matched");
            let (operation, body) =
                build_request_projection_for_target(target_provider, &outbound.request)
                    .map_err(CompatProjectionError::new)?;

            Ok(ProviderRequestCarrier {
                operation,
                body: Value::Object(body),
                metadata: build_provider_request_metadata(
                    &outbound.request.metadata,
                    outbound.protocol_mapping_audit.as_ref(),
                ),
                route: build_provider_route_handoff(route),
            })
        }
        Some(target_provider) => Err(CompatProjectionError::new(format!(
            "canonical outbound target provider `{target_provider}` is not supported yet"
        ))),
        None => Err(CompatProjectionError::new(
            "canonical outbound target provider is required",
        )),
    }
}

fn build_responses_provider_request_carrier(
    outbound: &HubCanonicalOutboundRequest,
    route: Option<&RouteDecision>,
) -> Result<ProviderRequestCarrier, CompatProjectionError> {
    let body = normalize_compat_request_payload(&outbound.request.raw_payload_text);
    let body = match body {
        Value::Object(body) => Value::Object(body),
        Value::Null => Value::Object(Map::new()),
        other => {
            return Err(CompatProjectionError::new(format!(
                "responses provider projection requires object payload, got {}",
                json_type_name(&other)
            )));
        }
    };

    Ok(ProviderRequestCarrier {
        operation: outbound.request.operation.clone(),
        body,
        metadata: build_provider_request_metadata(
            &outbound.request.metadata,
            outbound.protocol_mapping_audit.as_ref(),
        ),
        route: build_provider_route_handoff(route),
    })
}

fn build_provider_route_handoff(route: Option<&RouteDecision>) -> Option<ProviderRouteHandoff> {
    let route = route?;
    if route.target_block != "pipeline" {
        return None;
    }
    if route.selected_route.is_none() && route.selected_target.is_none() {
        return None;
    }
    Some(ProviderRouteHandoff {
        selected_route: route.selected_route.clone(),
        selected_target: route.selected_target.clone(),
    })
}

fn build_provider_request_metadata(
    request_metadata: &Map<String, Value>,
    protocol_mapping_audit: Option<&ProtocolMappingAudit>,
) -> Value {
    let mut metadata = request_metadata.clone();
    if let Some(audit) = protocol_mapping_audit.filter(|audit| !audit.is_empty()) {
        metadata.insert(
            "protocol_mapping_audit".to_string(),
            protocol_mapping_audit_to_value(audit),
        );
    }
    Value::Object(metadata)
}

fn read_first_string(record: &Map<String, Value>, keys: &[&str]) -> Option<String> {
    keys.iter()
        .filter_map(|key| record.get(*key).and_then(Value::as_str))
        .map(str::trim)
        .find(|value| !value.is_empty())
        .map(ToOwned::to_owned)
}

pub fn build_canonical_response(response: &ProviderResponseCarrier) -> CompatCanonicalResponse {
    let provider_status = normalize_status(&response.status);
    let response_id = response
        .body
        .get("id")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string);

    let anthropic_normalized = normalize_anthropic_response_body(&response.body);
    let status = anthropic_normalized
        .as_ref()
        .map(|normalized| normalized.status.clone())
        .or_else(|| {
            response
                .body
                .get("status")
                .and_then(Value::as_str)
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(str::to_string)
        })
        .unwrap_or_else(|| provider_status.clone());
    let required_action = anthropic_normalized
        .as_ref()
        .map(|normalized| normalized.required_action.clone())
        .unwrap_or_else(|| {
            response
                .body
                .get("required_action")
                .cloned()
                .unwrap_or(Value::Null)
        });
    let output = anthropic_normalized
        .as_ref()
        .map(|normalized| normalized.output.clone())
        .unwrap_or_else(|| {
            response
                .body
                .get("output")
                .cloned()
                .unwrap_or_else(|| build_output_text(extract_provider_response_text(response)))
        });

    CompatCanonicalResponse {
        response_id,
        status: status.clone(),
        output,
        required_action,
        raw_carrier: json!({
            "runtime": response.runtime.clone(),
            "status": status,
            "body": response.body.clone(),
            "headers": response.headers.clone(),
            "raw_stream_carrier": response.raw_stream_carrier.clone(),
        }),
    }
}

#[derive(Debug, Clone)]
struct AnthropicNormalizedResponseBody {
    status: String,
    output: Value,
    required_action: Value,
}

fn normalize_anthropic_response_body(body: &Value) -> Option<AnthropicNormalizedResponseBody> {
    let record = body.as_object()?;
    if !looks_like_anthropic_message_response(record) {
        return None;
    }

    let role = read_first_string(record, &["role"]).unwrap_or_else(|| "assistant".to_string());
    let content = record.get("content").and_then(Value::as_array)?;

    let mut message_content = Vec::new();
    let mut tool_calls = Vec::new();
    let mut output = Vec::new();

    for item in content {
        let entry = item.as_object()?;
        match entry
            .get("type")
            .and_then(Value::as_str)
            .map(str::trim)
            .unwrap_or("")
        {
            "text" => {
                if let Some(text) = entry
                    .get("text")
                    .and_then(Value::as_str)
                    .map(str::trim)
                    .filter(|value| !value.is_empty())
                {
                    message_content.push(json!({
                        "type": "output_text",
                        "text": text,
                    }));
                }
            }
            "tool_use" => {
                let id = read_first_string(entry, &["id", "tool_call_id", "call_id"])?;
                let name = read_first_string(entry, &["name"])?;
                let arguments = entry.get("input").cloned().unwrap_or_else(|| json!({}));
                let arguments_text = serialize_tool_arguments_text(&arguments);
                let tool_call = json!({
                    "id": id,
                    "tool_call_id": id,
                    "type": "function",
                    "name": name,
                    "arguments": arguments_text,
                });
                tool_calls.push(tool_call);
                output.push(json!({
                    "type": "function_call",
                    "call_id": id,
                    "name": name,
                    "arguments": arguments_text,
                }));
            }
            _ => {}
        }
    }

    if !message_content.is_empty() {
        output.insert(
            0,
            json!({
                "type": "message",
                "role": role,
                "content": message_content,
            }),
        );
    }

    if output.is_empty() {
        output = build_output_text(body.to_string())
            .as_array()
            .cloned()
            .unwrap_or_default();
    }

    let requires_action = !tool_calls.is_empty()
        || record
            .get("stop_reason")
            .and_then(Value::as_str)
            .map(str::trim)
            .is_some_and(|value| value == "tool_use");

    let required_action = if tool_calls.is_empty() {
        Value::Null
    } else {
        json!({
            "type": "submit_tool_outputs",
            "submit_tool_outputs": {
                "tool_calls": tool_calls,
            }
        })
    };

    Some(AnthropicNormalizedResponseBody {
        status: if requires_action {
            "requires_action".to_string()
        } else {
            read_first_string(record, &["status"]).unwrap_or_else(|| "completed".to_string())
        },
        output: Value::Array(output),
        required_action,
    })
}

fn looks_like_anthropic_message_response(record: &Map<String, Value>) -> bool {
    record
        .get("type")
        .and_then(Value::as_str)
        .map(str::trim)
        .is_some_and(|value| value == "message")
        || record.get("content").is_some_and(Value::is_array)
        || record
            .get("stop_reason")
            .and_then(Value::as_str)
            .map(str::trim)
            .is_some()
}

fn serialize_tool_arguments_text(arguments: &Value) -> String {
    match arguments {
        Value::String(raw) => raw.clone(),
        other => other.to_string(),
    }
}

pub fn extract_output_text(response: &CompatCanonicalResponse) -> String {
    response
        .output
        .get(0)
        .and_then(|item| item.get("content"))
        .and_then(Value::as_array)
        .and_then(|items| items.first())
        .and_then(|item| item.get("text"))
        .and_then(Value::as_str)
        .map(str::to_string)
        .unwrap_or_else(|| response.output.to_string())
}

fn metadata_is_empty(value: &Value) -> bool {
    value.as_object().map(|map| map.is_empty()).unwrap_or(true)
}

fn trimmed_non_empty(value: Option<&str>) -> Option<&str> {
    value.map(str::trim).filter(|value| !value.is_empty())
}

fn normalize_status(status: &str) -> String {
    let trimmed = status.trim();
    if trimmed.is_empty() {
        "completed".to_string()
    } else {
        trimmed.to_string()
    }
}

fn json_type_name(value: &Value) -> &'static str {
    match value {
        Value::Null => "null",
        Value::Bool(_) => "bool",
        Value::Number(_) => "number",
        Value::String(_) => "string",
        Value::Array(_) => "array",
        Value::Object(_) => "object",
    }
}

fn extract_provider_response_text(response: &ProviderResponseCarrier) -> String {
    if let Some(text) = response.body.get("text").and_then(Value::as_str) {
        return text.to_string();
    }

    if let Some(text) = response.body.as_str() {
        return text.to_string();
    }

    response.body.to_string()
}

fn build_output_text(text: String) -> Value {
    json!([
        {
            "type": "message",
            "role": "assistant",
            "content": [
                {
                    "type": "output_text",
                    "text": text,
                }
            ]
        }
    ])
}

#[cfg(test)]
mod tests {
    use serde_json::{json, Map, Value};

    use crate::{
        build_responses_cross_protocol_audit, RequestEnvelope, TARGET_PROTOCOL_ANTHROPIC,
        TARGET_PROTOCOL_GEMINI,
    };

    use super::{
        build_canonical_response, build_provider_request_carrier,
        build_provider_request_carrier_from_canonical_outbound, extract_output_text,
        normalize_compat_canonical_request, normalize_compat_request_payload,
        CompatProjectionError, ProviderResponseCarrier, ANTHROPIC_MESSAGES_OPERATION,
        GEMINI_CHAT_OPERATION,
    };

    #[test]
    fn normalize_compat_request_payload_defaults_empty_to_object() {
        assert_eq!(normalize_compat_request_payload(""), json!({}));
    }

    #[test]
    fn normalize_compat_canonical_request_extracts_minimal_responses_fields() {
        let canonical = normalize_compat_canonical_request(&RequestEnvelope::new(
            "responses",
            r#"{"model":"gpt-5","input":"继续执行","stream":false,"metadata":{"trace_id":"phase8"}}"#,
        ));

        assert_eq!(canonical.operation, "responses");
        assert_eq!(canonical.model.as_deref(), Some("gpt-5"));
        assert_eq!(canonical.input, Some(json!("继续执行")));
        assert_eq!(canonical.stream, Some(false));
        assert_eq!(canonical.metadata["trace_id"], "phase8");
    }

    #[test]
    fn build_provider_request_carrier_preserves_supported_minimal_fields() {
        let canonical = normalize_compat_canonical_request(&RequestEnvelope::new(
            "responses",
            r#"{"model":"gpt-5","messages":[{"role":"user","content":"继续执行"}],"stream":true,"metadata":{"trace_id":"phase8"}}"#,
        ));

        let carrier = build_provider_request_carrier(&canonical, None);

        assert_eq!(carrier.operation, "responses");
        assert_eq!(carrier.body["model"], "gpt-5");
        assert_eq!(carrier.body["messages"][0]["role"], "user");
        assert_eq!(carrier.body["stream"], true);
        assert_eq!(carrier.body["metadata"]["trace_id"], "phase8");
        assert_eq!(carrier.route, None);
    }

    #[test]
    fn build_provider_request_carrier_falls_back_to_raw_payload_for_plain_text() {
        let canonical =
            normalize_compat_canonical_request(&RequestEnvelope::new("smoke", "phase8-smoke"));

        let carrier = build_provider_request_carrier(&canonical, None);

        assert_eq!(carrier.body["payload"], "phase8-smoke");
        assert_eq!(carrier.route, None);
    }

    #[test]
    fn build_provider_request_carrier_projects_route_handoff_without_rewriting_body() {
        let canonical = normalize_compat_canonical_request(&RequestEnvelope::new(
            "responses",
            r#"{"model":"gpt-5","input":"继续执行"}"#,
        ));

        let carrier = build_provider_request_carrier(
            &canonical,
            Some(&crate::RouteDecision {
                target_block: "pipeline".to_string(),
                selected_route: Some("multimodal".to_string()),
                selected_target: Some("openai.vision.gpt-4o".to_string()),
                candidate_routes: vec!["multimodal".to_string(), "default".to_string()],
            }),
        );

        assert_eq!(carrier.body["model"], "gpt-5");
        assert_eq!(carrier.body["input"], "继续执行");
        assert_eq!(
            carrier.route,
            Some(crate::ProviderRouteHandoff {
                selected_route: Some("multimodal".to_string()),
                selected_target: Some("openai.vision.gpt-4o".to_string()),
            })
        );
    }

    #[test]
    fn build_canonical_response_synthesizes_output_text_from_provider_text() {
        let canonical = build_canonical_response(&ProviderResponseCarrier {
            runtime: "noop-runtime".to_string(),
            status: "completed".to_string(),
            body: json!({
                "text": "runtime=noop-runtime operation=responses"
            }),
            headers: json!({}),
            raw_stream_carrier: Value::Null,
        });

        assert_eq!(canonical.status, "completed");
        assert_eq!(canonical.raw_carrier["runtime"], "noop-runtime");
        assert_eq!(
            extract_output_text(&canonical),
            "runtime=noop-runtime operation=responses"
        );
        assert_eq!(canonical.response_id, None);
    }

    #[test]
    fn build_canonical_response_normalizes_anthropic_text_message() {
        let canonical = build_canonical_response(&ProviderResponseCarrier {
            runtime: "transport-runtime".to_string(),
            status: "completed".to_string(),
            body: json!({
                "id": "msg_text_1",
                "type": "message",
                "role": "assistant",
                "content": [
                    {
                        "type": "text",
                        "text": "股价是 189.10"
                    }
                ],
                "stop_reason": "end_turn"
            }),
            headers: json!({}),
            raw_stream_carrier: Value::Null,
        });

        assert_eq!(canonical.response_id.as_deref(), Some("msg_text_1"));
        assert_eq!(canonical.status, "completed");
        assert_eq!(canonical.required_action, Value::Null);
        assert_eq!(canonical.output[0]["type"], "message");
        assert_eq!(canonical.output[0]["content"][0]["type"], "output_text");
        assert_eq!(canonical.output[0]["content"][0]["text"], "股价是 189.10");
        assert_eq!(extract_output_text(&canonical), "股价是 189.10");
    }

    #[test]
    fn build_canonical_response_normalizes_anthropic_tool_use_to_required_action() {
        let canonical = build_canonical_response(&ProviderResponseCarrier {
            runtime: "transport-runtime".to_string(),
            status: "completed".to_string(),
            body: json!({
                "id": "msg_tool_1",
                "type": "message",
                "role": "assistant",
                "content": [
                    {
                        "type": "text",
                        "text": "我来查询股价"
                    },
                    {
                        "type": "tool_use",
                        "id": "call_lookup_price",
                        "name": "lookup_price",
                        "input": {
                            "ticker": "AAPL"
                        }
                    }
                ],
                "stop_reason": "tool_use"
            }),
            headers: json!({}),
            raw_stream_carrier: Value::Null,
        });

        assert_eq!(canonical.response_id.as_deref(), Some("msg_tool_1"));
        assert_eq!(canonical.status, "requires_action");
        assert_eq!(
            canonical.required_action["submit_tool_outputs"]["tool_calls"][0]["tool_call_id"],
            "call_lookup_price"
        );
        assert_eq!(
            canonical.required_action["submit_tool_outputs"]["tool_calls"][0]["arguments"],
            "{\"ticker\":\"AAPL\"}"
        );
        assert_eq!(canonical.output[0]["type"], "message");
        assert_eq!(canonical.output[1]["type"], "function_call");
        assert_eq!(canonical.output[1]["call_id"], "call_lookup_price");
        assert_eq!(canonical.output[1]["arguments"], "{\"ticker\":\"AAPL\"}");
    }

    #[test]
    fn minimal_responses_anthropic_semantic_roundtrip_preserves_tool_signature() {
        let request = crate::lift_responses_request_to_canonical(RequestEnvelope::new(
            "responses",
            r#"{
              "model":"claude-sonnet-4-5",
              "input":"查询股价",
              "tools":[
                {
                  "type":"function",
                  "function":{
                    "name":"lookup_price",
                    "description":"查询股价",
                    "parameters":{"type":"object","properties":{"ticker":{"type":"string"}}}
                  }
                }
              ]
            }"#,
        ))
        .expect("canonical request");
        let outbound = crate::HubCanonicalOutboundRequest {
            request,
            target_provider_id: Some("anthropic".to_string()),
            continuation_owner: crate::ResponsesContinuationOwner::None,
            protocol_mapping_audit: None,
        };
        let carrier = build_provider_request_carrier_from_canonical_outbound(&outbound, None)
            .expect("anthropic request carrier");
        let canonical_response = build_canonical_response(&ProviderResponseCarrier {
            runtime: "transport-runtime".to_string(),
            status: "completed".to_string(),
            body: json!({
                "id": "msg_roundtrip_1",
                "type": "message",
                "role": "assistant",
                "content": [
                    {
                        "type": "tool_use",
                        "id": "call_lookup_price",
                        "name": "lookup_price",
                        "input": {"ticker":"AAPL"}
                    }
                ],
                "stop_reason": "tool_use"
            }),
            headers: json!({}),
            raw_stream_carrier: Value::Null,
        });

        assert_eq!(
            carrier.body["messages"][0]["content"][0]["text"],
            "查询股价"
        );
        assert_eq!(carrier.body["tools"][0]["name"], "lookup_price");
        assert_eq!(
            canonical_response.response_id.as_deref(),
            Some("msg_roundtrip_1")
        );
        assert_eq!(canonical_response.status, "requires_action");
        assert_eq!(
            canonical_response.required_action["submit_tool_outputs"]["tool_calls"][0]["name"],
            "lookup_price"
        );
        assert_eq!(
            canonical_response.required_action["submit_tool_outputs"]["tool_calls"][0]["arguments"],
            "{\"ticker\":\"AAPL\"}"
        );
    }

    #[test]
    fn build_provider_request_carrier_from_canonical_outbound_maps_anthropic_messages() {
        let request = crate::lift_responses_request_to_canonical(RequestEnvelope::new(
            "responses",
            r#"{
              "model":"claude-sonnet-4-5",
              "stream":true,
              "metadata":{"trace_id":"phase9"},
              "input":[
                {"type":"message","role":"developer","content":[{"type":"input_text","text":"只回答 JSON"}]},
                {"type":"message","role":"user","content":[{"type":"input_text","text":"查询股价"}]},
                {"type":"message","role":"assistant","content":[{"type":"output_text","text":"请给我代码"}]}
              ],
              "tools":[
                {
                  "type":"function",
                  "function":{
                    "name":"lookup_price",
                    "description":"查询股价",
                    "parameters":{"type":"object","properties":{"ticker":{"type":"string"}}}
                  }
                }
              ]
            }"#,
        ))
        .expect("canonical request");
        let outbound = crate::HubCanonicalOutboundRequest {
            request,
            target_provider_id: Some("anthropic".to_string()),
            continuation_owner: crate::ResponsesContinuationOwner::None,
            protocol_mapping_audit: None,
        };

        let carrier = build_provider_request_carrier_from_canonical_outbound(
            &outbound,
            Some(&crate::RouteDecision {
                target_block: "pipeline".to_string(),
                selected_route: Some("ops".to_string()),
                selected_target: Some("anthropic.ops.claude-3".to_string()),
                candidate_routes: vec!["ops".to_string()],
            }),
        )
        .expect("carrier");

        assert_eq!(carrier.operation, ANTHROPIC_MESSAGES_OPERATION);
        assert_eq!(carrier.body["model"], "claude-sonnet-4-5");
        assert_eq!(carrier.body["stream"], true);
        assert_eq!(carrier.body["metadata"]["trace_id"], "phase9");
        assert_eq!(carrier.body["system"][0]["type"], "text");
        assert_eq!(carrier.body["system"][0]["text"], "只回答 JSON");
        assert_eq!(carrier.body["messages"][0]["role"], "user");
        assert_eq!(carrier.body["messages"][0]["content"][0]["type"], "text");
        assert_eq!(
            carrier.body["messages"][0]["content"][0]["text"],
            "查询股价"
        );
        assert_eq!(carrier.body["messages"][1]["role"], "assistant");
        assert_eq!(carrier.body["tools"][0]["name"], "lookup_price");
        assert_eq!(carrier.body["tools"][0]["input_schema"]["type"], "object");
        assert_eq!(
            carrier.route,
            Some(crate::ProviderRouteHandoff {
                selected_route: Some("ops".to_string()),
                selected_target: Some("anthropic.ops.claude-3".to_string()),
            })
        );
    }

    #[test]
    fn build_provider_request_carrier_from_canonical_outbound_maps_tool_use_and_tool_result_to_anthropic(
    ) {
        let request = crate::materialize_responses_continuation_fallback(
            crate::lift_responses_request_to_canonical(RequestEnvelope::new(
                "responses",
                r#"{
                  "model":"claude-sonnet-4-5",
                  "response_id":"resp-1",
                  "input":[
                    {"type":"message","role":"assistant","content":[
                      {"type":"function_call","call_id":"call_lookup_price","name":"lookup_price","arguments":"{\"ticker\":\"AAPL\"}"}
                    ]}
                  ],
                  "tool_outputs":[
                    {"tool_call_id":"call_lookup_price","output":"AAPL: 189.10"}
                  ]
                }"#,
            ))
            .expect("canonical request"),
        )
        .expect("materialized canonical");
        let outbound = crate::HubCanonicalOutboundRequest {
            request,
            target_provider_id: Some("anthropic".to_string()),
            continuation_owner: crate::ResponsesContinuationOwner::ChatProcessFallback,
            protocol_mapping_audit: None,
        };

        let carrier = build_provider_request_carrier_from_canonical_outbound(&outbound, None)
            .expect("anthropic carrier");

        assert_eq!(carrier.operation, ANTHROPIC_MESSAGES_OPERATION);
        assert_eq!(carrier.body["messages"][0]["role"], "assistant");
        assert_eq!(
            carrier.body["messages"][0]["content"][0]["type"],
            "tool_use"
        );
        assert_eq!(
            carrier.body["messages"][0]["content"][0]["id"],
            "call_lookup_price"
        );
        assert_eq!(carrier.body["messages"][1]["role"], "user");
        assert_eq!(
            carrier.body["messages"][1]["content"][0]["type"],
            "tool_result"
        );
        assert_eq!(
            carrier.body["messages"][1]["content"][0]["tool_use_id"],
            "call_lookup_price"
        );
        assert_eq!(
            carrier.body["messages"][1]["content"][0]["content"],
            "AAPL: 189.10"
        );
    }

    #[test]
    fn build_provider_request_carrier_from_canonical_outbound_keeps_responses_payload_for_responses_targets(
    ) {
        let request = crate::lift_responses_request_to_canonical(RequestEnvelope::new(
            "responses",
            r#"{"model":"gpt-5","input":"继续执行","metadata":{"trace_id":"phase9"}}"#,
        ))
        .expect("canonical request");
        let outbound = crate::HubCanonicalOutboundRequest {
            request,
            target_provider_id: Some("responses".to_string()),
            continuation_owner: crate::ResponsesContinuationOwner::None,
            protocol_mapping_audit: None,
        };

        let carrier = build_provider_request_carrier_from_canonical_outbound(&outbound, None)
            .expect("responses carrier");

        assert_eq!(carrier.operation, "responses");
        assert_eq!(carrier.body["model"], "gpt-5");
        assert_eq!(carrier.body["input"], "继续执行");
        assert_eq!(carrier.body["metadata"]["trace_id"], "phase9");
    }

    #[test]
    fn build_provider_request_carrier_from_canonical_outbound_maps_gemini_contents_and_tools() {
        let request = crate::lift_responses_request_to_canonical(RequestEnvelope::new(
            "responses",
            r#"{
              "model":"gemini-2.5-pro",
              "metadata":{"trace_id":"phase8"},
              "input":[
                {"type":"message","role":"developer","content":[{"type":"input_text","text":"只回答 JSON"}]},
                {"type":"message","role":"user","content":[{"type":"input_text","text":"查询股价"}]},
                {"type":"message","role":"assistant","content":[{"type":"function_call","call_id":"call_lookup_price","name":"lookup_price","arguments":"{\"ticker\":\"AAPL\"}"}]}
              ],
              "tool_outputs":[
                {"tool_call_id":"call_lookup_price","output":"AAPL: 189.10"}
              ],
              "tools":[
                {
                  "type":"function",
                  "function":{
                    "name":"lookup_price",
                    "description":"查询股价",
                    "parameters":{"type":"object","properties":{"ticker":{"type":"string"}}}
                  }
                }
              ]
            }"#,
        ))
        .expect("canonical request");
        let outbound = crate::HubCanonicalOutboundRequest {
            request,
            target_provider_id: Some("gemini".to_string()),
            continuation_owner: crate::ResponsesContinuationOwner::None,
            protocol_mapping_audit: None,
        };

        let carrier = build_provider_request_carrier_from_canonical_outbound(&outbound, None)
            .expect("gemini carrier");

        assert_eq!(carrier.operation, GEMINI_CHAT_OPERATION);
        assert_eq!(carrier.body["systemInstruction"]["role"], "system");
        assert_eq!(
            carrier.body["systemInstruction"]["parts"][0]["text"],
            "只回答 JSON"
        );
        assert_eq!(carrier.body["contents"][0]["role"], "user");
        assert_eq!(carrier.body["contents"][0]["parts"][0]["text"], "查询股价");
        assert_eq!(carrier.body["contents"][1]["role"], "model");
        assert_eq!(
            carrier.body["contents"][1]["parts"][0]["functionCall"]["name"],
            "lookup_price"
        );
        assert_eq!(
            carrier.body["contents"][1]["parts"][0]["functionCall"]["args"]["ticker"],
            "AAPL"
        );
        assert_eq!(carrier.body["contents"][2]["role"], "user");
        assert_eq!(
            carrier.body["contents"][2]["parts"][0]["functionResponse"]["name"],
            "lookup_price"
        );
        assert_eq!(
            carrier.body["contents"][2]["parts"][0]["functionResponse"]["response"]["result"],
            "AAPL: 189.10"
        );
        assert_eq!(
            carrier.body["tools"][0]["functionDeclarations"][0]["name"],
            "lookup_price"
        );
        assert!(carrier.body.get("metadata").is_none());
        assert_eq!(carrier.metadata["trace_id"], "phase8");
    }

    #[test]
    fn build_provider_request_carrier_from_canonical_outbound_requires_target_provider() {
        let outbound = crate::HubCanonicalOutboundRequest {
            request: crate::HubCanonicalRequest {
                source_protocol: "openai-responses".to_string(),
                operation: "responses".to_string(),
                model: Some("claude-sonnet-4-5".to_string()),
                stream: None,
                response_id: None,
                previous_response_id: None,
                messages: Vec::new(),
                tools: Vec::new(),
                tool_results: Vec::new(),
                metadata: serde_json::Map::new(),
                raw_payload_text: "{}".to_string(),
            },
            target_provider_id: None,
            continuation_owner: crate::ResponsesContinuationOwner::None,
            protocol_mapping_audit: None,
        };

        let error = build_provider_request_carrier_from_canonical_outbound(&outbound, None)
            .expect_err("missing target provider must fail");

        assert_eq!(
            error,
            CompatProjectionError::new("canonical outbound target provider is required")
        );
    }

    #[test]
    fn build_provider_request_carrier_from_canonical_outbound_requires_model_for_anthropic() {
        let outbound = crate::HubCanonicalOutboundRequest {
            request: crate::HubCanonicalRequest {
                source_protocol: "openai-responses".to_string(),
                operation: "responses".to_string(),
                model: None,
                stream: None,
                response_id: None,
                previous_response_id: None,
                messages: Vec::new(),
                tools: Vec::new(),
                tool_results: Vec::new(),
                metadata: serde_json::Map::new(),
                raw_payload_text: "{}".to_string(),
            },
            target_provider_id: Some("anthropic".to_string()),
            continuation_owner: crate::ResponsesContinuationOwner::None,
            protocol_mapping_audit: None,
        };

        let error = build_provider_request_carrier_from_canonical_outbound(&outbound, None)
            .expect_err("missing model must fail");

        assert!(error
            .to_string()
            .contains("required source pointer missing: /model"));
    }

    #[test]
    fn build_provider_request_metadata_projects_gemini_audit_sidecar() {
        let audit = build_responses_cross_protocol_audit(
            &json!({
                "tool_choice": "required",
                "reasoning": {"effort":"high"}
            }),
            TARGET_PROTOCOL_GEMINI,
        );
        let metadata = super::build_provider_request_metadata(&Map::new(), Some(&audit));

        assert_eq!(
            metadata["protocol_mapping_audit"]["preserved"][0]["target_protocol"],
            "gemini-chat"
        );
        assert_eq!(
            metadata["protocol_mapping_audit"]["lossy"][0]["disposition"],
            "lossy"
        );
    }

    #[test]
    fn build_provider_request_carrier_from_canonical_outbound_projects_audit_sidecar_only_to_metadata(
    ) {
        let request = crate::lift_responses_request_to_canonical(RequestEnvelope::new(
            "responses",
            r#"{
              "model":"claude-sonnet-4-5",
              "metadata":{"trace_id":"phase9"},
              "tool_choice":"required",
              "reasoning":{"effort":"medium"},
              "input":"查询股价"
            }"#,
        ))
        .expect("canonical request");
        let audit = build_responses_cross_protocol_audit(
            &serde_json::from_str::<Value>(&request.raw_payload_text).expect("raw payload"),
            TARGET_PROTOCOL_ANTHROPIC,
        );
        let outbound = crate::HubCanonicalOutboundRequest {
            request,
            target_provider_id: Some("anthropic".to_string()),
            continuation_owner: crate::ResponsesContinuationOwner::None,
            protocol_mapping_audit: Some(audit),
        };

        let carrier = build_provider_request_carrier_from_canonical_outbound(&outbound, None)
            .expect("anthropic carrier");

        assert_eq!(carrier.metadata["trace_id"], "phase9");
        assert_eq!(
            carrier.metadata["protocol_mapping_audit"]["preserved"][0]["field"],
            "tool_choice"
        );
        assert_eq!(
            carrier.metadata["protocol_mapping_audit"]["lossy"][0]["field"],
            "reasoning"
        );
        assert!(carrier.body.get("protocol_mapping_audit").is_none());
        assert!(carrier.body["metadata"]
            .as_object()
            .is_some_and(|metadata| !metadata.contains_key("protocol_mapping_audit")));
    }

    #[test]
    fn build_provider_request_carrier_from_canonical_outbound_projects_gemini_audit_sidecar_only_to_metadata(
    ) {
        let request = crate::lift_responses_request_to_canonical(RequestEnvelope::new(
            "responses",
            r#"{
              "model":"gemini-2.5-pro",
              "metadata":{"trace_id":"phase8"},
              "tool_choice":"required",
              "reasoning":{"effort":"medium"},
              "input":"查询股价"
            }"#,
        ))
        .expect("canonical request");
        let audit = build_responses_cross_protocol_audit(
            &serde_json::from_str::<Value>(&request.raw_payload_text).expect("raw payload"),
            TARGET_PROTOCOL_GEMINI,
        );
        let outbound = crate::HubCanonicalOutboundRequest {
            request,
            target_provider_id: Some("gemini".to_string()),
            continuation_owner: crate::ResponsesContinuationOwner::None,
            protocol_mapping_audit: Some(audit),
        };

        let carrier = build_provider_request_carrier_from_canonical_outbound(&outbound, None)
            .expect("gemini carrier");

        assert_eq!(
            carrier.metadata["protocol_mapping_audit"]["preserved"][0]["target_protocol"],
            "gemini-chat"
        );
        assert_eq!(
            carrier.metadata["protocol_mapping_audit"]["lossy"][0]["field"],
            "reasoning"
        );
        assert!(!carrier.body.to_string().contains("protocol_mapping_audit"));
    }
}
