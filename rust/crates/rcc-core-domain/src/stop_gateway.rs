use regex::Regex;
use serde_json::Value;
use std::sync::OnceLock;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StopGatewayContext {
    pub observed: bool,
    pub eligible: bool,
    pub source: String,
    pub reason: String,
    pub choice_index: Option<usize>,
    pub has_tool_calls: Option<bool>,
}

fn harvestable_tool_marker_regex() -> &'static Regex {
    static REGEX: OnceLock<Regex> = OnceLock::new();
    REGEX.get_or_init(|| {
        Regex::new(
            r"<\|\s*tool_calls_section_begin\s*\|>|<\|\s*tool_call_begin\s*\|>|<\|\s*tool_call_argument_begin\s*\|>",
        )
        .expect("valid harvestable tool marker regex")
    })
}

pub fn has_harvestable_tool_markers(value: &Value) -> bool {
    match value {
        Value::String(text) => harvestable_tool_marker_regex().is_match(text),
        Value::Array(items) => items.iter().any(has_harvestable_tool_markers),
        Value::Object(obj) => obj.values().any(has_harvestable_tool_markers),
        _ => false,
    }
}

pub fn has_embedded_tool_call_markers_in_chat_message(message: &Value) -> bool {
    let Some(obj) = message.as_object() else {
        return false;
    };

    let reasoning = obj.get("reasoning");
    let mut candidates = vec![
        obj.get("content").cloned().unwrap_or(Value::Null),
        obj.get("reasoning_content").cloned().unwrap_or(Value::Null),
        obj.get("thinking").cloned().unwrap_or(Value::Null),
        reasoning.cloned().unwrap_or(Value::Null),
    ];

    if let Some(reasoning_obj) = reasoning.and_then(Value::as_object) {
        candidates.push(reasoning_obj.get("content").cloned().unwrap_or(Value::Null));
        candidates.push(reasoning_obj.get("text").cloned().unwrap_or(Value::Null));
    }

    has_harvestable_tool_markers(&Value::Array(candidates))
}

pub fn has_tool_like_output(value: &Value) -> bool {
    let Some(obj) = value.as_object() else {
        return false;
    };
    let type_value = obj
        .get("type")
        .and_then(Value::as_str)
        .map(|value| value.trim().to_lowercase())
        .unwrap_or_default();

    !type_value.is_empty()
        && (type_value == "tool_call"
            || type_value == "tool_use"
            || type_value == "function_call"
            || type_value.contains("tool"))
}

pub fn inspect_stop_gateway_signal(base: &Value) -> StopGatewayContext {
    let Some(payload) = base.as_object() else {
        return StopGatewayContext {
            observed: false,
            eligible: false,
            source: "none".to_string(),
            reason: "invalid_payload".to_string(),
            choice_index: None,
            has_tool_calls: None,
        };
    };

    if let Some(choices) = payload.get("choices").and_then(Value::as_array) {
        if !choices.is_empty() {
            for (idx, choice) in choices.iter().enumerate() {
                let Some(choice_obj) = choice.as_object() else {
                    continue;
                };
                let finish_reason = choice_obj
                    .get("finish_reason")
                    .and_then(Value::as_str)
                    .map(|value| value.trim().to_lowercase())
                    .unwrap_or_default();

                if finish_reason.is_empty() || finish_reason == "tool_calls" {
                    continue;
                }
                if finish_reason != "stop" && finish_reason != "length" {
                    continue;
                }

                let message = choice_obj.get("message").cloned().unwrap_or(Value::Null);
                if has_embedded_tool_call_markers_in_chat_message(&message) {
                    return StopGatewayContext {
                        observed: true,
                        eligible: false,
                        source: "chat".to_string(),
                        reason: format!(
                            "finish_reason_{}_with_embedded_tool_markers",
                            finish_reason
                        ),
                        choice_index: Some(idx),
                        has_tool_calls: Some(false),
                    };
                }

                let has_tool_calls = message
                    .as_object()
                    .and_then(|message_obj| message_obj.get("tool_calls"))
                    .and_then(Value::as_array)
                    .is_some_and(|calls| !calls.is_empty());

                return StopGatewayContext {
                    observed: true,
                    eligible: !has_tool_calls,
                    source: "chat".to_string(),
                    reason: format!("finish_reason_{}", finish_reason),
                    choice_index: Some(idx),
                    has_tool_calls: Some(has_tool_calls),
                };
            }

            return StopGatewayContext {
                observed: false,
                eligible: false,
                source: "chat".to_string(),
                reason: "no_stop_finish_reason".to_string(),
                choice_index: None,
                has_tool_calls: None,
            };
        }
    }

    let status_raw = payload
        .get("status")
        .and_then(Value::as_str)
        .map(|value| value.trim().to_lowercase())
        .unwrap_or_default();

    if !status_raw.is_empty() && status_raw != "completed" {
        return StopGatewayContext {
            observed: false,
            eligible: false,
            source: "responses".to_string(),
            reason: format!("status_{}", status_raw),
            choice_index: None,
            has_tool_calls: None,
        };
    }

    let has_required_action = payload
        .get("required_action")
        .is_some_and(|value| value.is_object());
    let output = payload
        .get("output")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();

    if status_raw.is_empty() && output.is_empty() {
        return StopGatewayContext {
            observed: false,
            eligible: false,
            source: "responses".to_string(),
            reason: "no_status_or_output".to_string(),
            choice_index: None,
            has_tool_calls: None,
        };
    }

    if output.iter().any(has_tool_like_output) {
        return StopGatewayContext {
            observed: true,
            eligible: false,
            source: "responses".to_string(),
            reason: "responses_tool_like_output".to_string(),
            choice_index: None,
            has_tool_calls: None,
        };
    }

    if has_required_action {
        return StopGatewayContext {
            observed: true,
            eligible: false,
            source: "responses".to_string(),
            reason: "responses_required_action".to_string(),
            choice_index: None,
            has_tool_calls: None,
        };
    }

    StopGatewayContext {
        observed: true,
        eligible: true,
        source: "responses".to_string(),
        reason: if status_raw.is_empty() {
            "responses_output_completed".to_string()
        } else {
            format!("status_{}", status_raw)
        },
        choice_index: None,
        has_tool_calls: None,
    }
}

pub fn is_stop_eligible_for_server_tool(base: &Value) -> bool {
    inspect_stop_gateway_signal(base).eligible
}

#[cfg(test)]
mod tests {
    use super::{
        has_embedded_tool_call_markers_in_chat_message, has_harvestable_tool_markers,
        has_tool_like_output, inspect_stop_gateway_signal, is_stop_eligible_for_server_tool,
    };
    use serde_json::json;

    #[test]
    fn invalid_payload_is_not_observed_or_eligible() {
        let ctx = inspect_stop_gateway_signal(&json!("bad"));
        assert_eq!(ctx.source, "none");
        assert_eq!(ctx.reason, "invalid_payload");
        assert!(!ctx.observed);
        assert!(!ctx.eligible);
    }

    #[test]
    fn detects_embedded_tool_markers_recursively() {
        assert!(has_harvestable_tool_markers(&json!({
            "nested": ["<|tool_call_begin|>"]
        })));

        assert!(has_embedded_tool_call_markers_in_chat_message(&json!({
            "reasoning": {"content": "<|tool_call_argument_begin|>"}
        })));
    }

    #[test]
    fn chat_stop_is_blocked_when_embedded_markers_or_tool_calls_exist() {
        let embedded = inspect_stop_gateway_signal(&json!({
            "choices": [{
                "finish_reason": "stop",
                "message": {"content": "<|tool_calls_section_begin|>"}
            }]
        }));
        assert_eq!(
            embedded.reason,
            "finish_reason_stop_with_embedded_tool_markers"
        );
        assert_eq!(embedded.has_tool_calls, Some(false));
        assert!(!embedded.eligible);

        let tool_calls = inspect_stop_gateway_signal(&json!({
            "choices": [{
                "finish_reason": "length",
                "message": {"tool_calls": [{"id": "1"}]}
            }]
        }));
        assert_eq!(tool_calls.reason, "finish_reason_length");
        assert_eq!(tool_calls.has_tool_calls, Some(true));
        assert!(!tool_calls.eligible);
    }

    #[test]
    fn chat_stop_is_eligible_when_no_embedded_markers_or_tool_calls() {
        let ctx = inspect_stop_gateway_signal(&json!({
            "choices": [{
                "finish_reason": "stop",
                "message": {"content": "done"}
            }]
        }));
        assert!(ctx.observed);
        assert!(ctx.eligible);
        assert_eq!(ctx.source, "chat");
        assert_eq!(ctx.choice_index, Some(0));
        assert!(is_stop_eligible_for_server_tool(&json!({
            "choices": [{
                "finish_reason": "stop",
                "message": {"content": "done"}
            }]
        })));
    }

    #[test]
    fn responses_status_and_required_action_are_respected() {
        let pending = inspect_stop_gateway_signal(&json!({
            "status": "in_progress"
        }));
        assert_eq!(pending.reason, "status_in_progress");
        assert!(!pending.observed);

        let required = inspect_stop_gateway_signal(&json!({
            "status": "completed",
            "required_action": {"type": "tool"}
        }));
        assert!(required.observed);
        assert!(!required.eligible);
        assert_eq!(required.reason, "responses_required_action");
    }

    #[test]
    fn responses_tool_like_output_and_completion_are_detected() {
        assert!(has_tool_like_output(&json!({"type": "tool_call"})));
        assert!(has_tool_like_output(&json!({"type": "custom_tool_result"})));
        assert!(!has_tool_like_output(&json!({"type": "message"})));

        let blocked = inspect_stop_gateway_signal(&json!({
            "output": [{"type": "function_call"}]
        }));
        assert_eq!(blocked.reason, "responses_tool_like_output");
        assert!(!blocked.eligible);

        let completed = inspect_stop_gateway_signal(&json!({
            "output": [{"type": "message"}]
        }));
        assert!(completed.observed);
        assert!(completed.eligible);
        assert_eq!(completed.reason, "responses_output_completed");
    }
}
