use rcc_core_domain::{inspect_stop_gateway_signal, StopGatewayContext};
use serde_json::{Map, Number, Value};

pub fn resolve_stop_gateway_context(payload: &Value) -> Option<Value> {
    let payload_obj = payload.as_object()?;

    if let Some(context) = payload_obj
        .get("stop_gateway_context")
        .and_then(normalize_stop_gateway_context)
    {
        return Some(stop_gateway_context_to_value(&context));
    }

    payload_obj
        .get("base_response")
        .map(|base| stop_gateway_context_to_value(&inspect_stop_gateway_signal(base)))
}

fn normalize_stop_gateway_context(raw: &Value) -> Option<StopGatewayContext> {
    let record = raw.as_object()?;
    let observed = record.get("observed").and_then(Value::as_bool)?;
    let eligible = record.get("eligible").and_then(Value::as_bool)?;
    let source = normalize_source(record.get("source"));
    let reason = record
        .get("reason")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or("unknown")
        .to_string();
    let choice_index = record
        .get("choice_index")
        .or_else(|| record.get("choiceIndex"))
        .and_then(normalize_choice_index);
    let has_tool_calls = record
        .get("has_tool_calls")
        .or_else(|| record.get("hasToolCalls"))
        .and_then(Value::as_bool);

    Some(StopGatewayContext {
        observed,
        eligible,
        source,
        reason,
        choice_index,
        has_tool_calls,
    })
}

fn normalize_source(raw: Option<&Value>) -> String {
    match raw
        .and_then(Value::as_str)
        .map(str::trim)
        .map(str::to_lowercase)
    {
        Some(source) if source == "chat" || source == "responses" || source == "none" => source,
        _ => "none".to_string(),
    }
}

fn normalize_choice_index(raw: &Value) -> Option<usize> {
    let number = raw.as_f64()?;
    if !number.is_finite() || number < 0.0 {
        return None;
    }

    let floored = number.floor();
    if floored > (usize::MAX as f64) {
        return None;
    }

    Some(floored as usize)
}

fn stop_gateway_context_to_value(context: &StopGatewayContext) -> Value {
    let mut object = Map::from_iter([
        ("observed".to_string(), Value::Bool(context.observed)),
        ("eligible".to_string(), Value::Bool(context.eligible)),
        ("source".to_string(), Value::String(context.source.clone())),
        ("reason".to_string(), Value::String(context.reason.clone())),
    ]);

    if let Some(choice_index) = context.choice_index {
        object.insert(
            "choice_index".to_string(),
            Value::Number(Number::from(choice_index)),
        );
    }

    if let Some(has_tool_calls) = context.has_tool_calls {
        object.insert("has_tool_calls".to_string(), Value::Bool(has_tool_calls));
    }

    Value::Object(object)
}

#[cfg(test)]
mod tests {
    use super::resolve_stop_gateway_context;
    use serde_json::json;

    #[test]
    fn explicit_stop_gateway_context_overrides_base_response() {
        let payload = json!({
            "base_response": {
                "choices": [{
                    "finish_reason": "stop",
                    "message": {
                        "content": "done"
                    }
                }]
            },
            "stop_gateway_context": {
                "observed": true,
                "eligible": false,
                "source": "chat",
                "reason": "cached_context",
                "choice_index": 0,
                "has_tool_calls": true
            }
        });

        let result = resolve_stop_gateway_context(&payload).expect("context");
        assert_eq!(
            result,
            json!({
                "observed": true,
                "eligible": false,
                "source": "chat",
                "reason": "cached_context",
                "choice_index": 0,
                "has_tool_calls": true
            })
        );
    }

    #[test]
    fn invalid_explicit_context_falls_back_to_domain_inspect() {
        let payload = json!({
            "base_response": {
                "choices": [{
                    "finish_reason": "stop",
                    "message": {
                        "content": "done"
                    }
                }]
            },
            "stop_gateway_context": {
                "observed": "bad",
                "eligible": true
            }
        });

        let result = resolve_stop_gateway_context(&payload).expect("context");
        assert_eq!(
            result,
            json!({
                "observed": true,
                "eligible": true,
                "source": "chat",
                "reason": "finish_reason_stop",
                "choice_index": 0,
                "has_tool_calls": false
            })
        );
    }

    #[test]
    fn chat_stop_without_tool_calls_is_eligible() {
        let payload = json!({
            "base_response": {
                "choices": [{
                    "finish_reason": "stop",
                    "message": {
                        "content": "done"
                    }
                }]
            }
        });

        let result = resolve_stop_gateway_context(&payload).expect("context");
        assert_eq!(result["eligible"], json!(true));
        assert_eq!(result["source"], json!("chat"));
        assert_eq!(result["has_tool_calls"], json!(false));
    }

    #[test]
    fn chat_tool_calls_and_embedded_markers_are_blocked() {
        let with_tool_calls = json!({
            "base_response": {
                "choices": [{
                    "finish_reason": "stop",
                    "message": {
                        "content": "done",
                        "tool_calls": [{"id": "call-1"}]
                    }
                }]
            }
        });
        let with_markers = json!({
            "base_response": {
                "choices": [{
                    "finish_reason": "stop",
                    "message": {
                        "content": "<|tool_calls_section_begin|>"
                    }
                }]
            }
        });

        let with_tool_calls_result =
            resolve_stop_gateway_context(&with_tool_calls).expect("context");
        assert_eq!(with_tool_calls_result["eligible"], json!(false));
        assert_eq!(with_tool_calls_result["has_tool_calls"], json!(true));

        let with_markers_result = resolve_stop_gateway_context(&with_markers).expect("context");
        assert_eq!(with_markers_result["eligible"], json!(false));
        assert_eq!(
            with_markers_result["reason"],
            json!("finish_reason_stop_with_embedded_tool_markers")
        );
        assert_eq!(with_markers_result["has_tool_calls"], json!(false));
    }

    #[test]
    fn responses_required_action_is_blocked() {
        let payload = json!({
            "base_response": {
                "status": "completed",
                "required_action": {
                    "type": "submit_tool_outputs"
                },
                "output": []
            }
        });

        let result = resolve_stop_gateway_context(&payload).expect("context");
        assert_eq!(result["eligible"], json!(false));
        assert_eq!(result["source"], json!("responses"));
        assert_eq!(result["reason"], json!("responses_required_action"));
    }

    #[test]
    fn normalizes_camel_case_and_invalid_source_to_canonical_fields() {
        let payload = json!({
            "stop_gateway_context": {
                "observed": true,
                "eligible": false,
                "source": "weird",
                "reason": "  cached_context  ",
                "choiceIndex": 2.9,
                "hasToolCalls": true
            }
        });

        let result = resolve_stop_gateway_context(&payload).expect("context");
        assert_eq!(
            result,
            json!({
                "observed": true,
                "eligible": false,
                "source": "none",
                "reason": "cached_context",
                "choice_index": 2,
                "has_tool_calls": true
            })
        );
    }

    #[test]
    fn returns_none_when_neither_context_nor_base_response_exists() {
        let payload = json!({
            "captured": {
                "model": "gpt-5"
            }
        });

        assert!(resolve_stop_gateway_context(&payload).is_none());
    }
}
