use serde_json::Value;

pub fn normalize_request_tool_choice_policy(input: &Value) -> Value {
    let mut out = input.as_object().cloned().unwrap_or_default();
    let tools = out
        .get("tools")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();

    if !tools.is_empty() {
        let missing_or_null =
            !out.contains_key("tool_choice") || out.get("tool_choice").is_some_and(Value::is_null);
        if missing_or_null {
            out.insert("tool_choice".to_string(), Value::String("auto".to_string()));
        }
    } else {
        out.remove("tool_choice");
    }

    Value::Object(out)
}

pub fn normalize_response_finish_invariants(input: &Value) -> Value {
    let mut out = input.as_object().cloned().unwrap_or_default();
    let choices = out
        .get("choices")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();

    let mut next_choices = Vec::with_capacity(choices.len());
    for choice in choices {
        let mut choice_obj = match choice {
            Value::Object(obj) => obj,
            other => {
                next_choices.push(other);
                continue;
            }
        };

        let tool_calls_len = choice_obj
            .get("message")
            .and_then(Value::as_object)
            .and_then(|message| message.get("tool_calls"))
            .and_then(Value::as_array)
            .map(|calls| calls.len())
            .unwrap_or(0);

        if tool_calls_len > 0 {
            if !choice_obj.contains_key("finish_reason")
                || choice_obj.get("finish_reason").is_some_and(Value::is_null)
            {
                choice_obj.insert(
                    "finish_reason".to_string(),
                    Value::String("tool_calls".to_string()),
                );
            }

            if let Some(Value::Object(message)) = choice_obj.get_mut("message") {
                message.insert("content".to_string(), Value::Null);
            }
        }

        next_choices.push(Value::Object(choice_obj));
    }

    out.insert("choices".to_string(), Value::Array(next_choices));
    Value::Object(out)
}

#[cfg(test)]
mod tests {
    use super::{normalize_request_tool_choice_policy, normalize_response_finish_invariants};
    use serde_json::json;

    #[test]
    fn request_adds_auto_tool_choice_when_tools_exist() {
        let input = json!({
            "tools": [{"type": "function"}]
        });
        let output = normalize_request_tool_choice_policy(&input);
        assert_eq!(
            output,
            json!({
                "tools": [{"type": "function"}],
                "tool_choice": "auto"
            })
        );
    }

    #[test]
    fn request_keeps_existing_tool_choice() {
        let input = json!({
            "tools": [{"type": "function"}],
            "tool_choice": "required"
        });
        let output = normalize_request_tool_choice_policy(&input);
        assert_eq!(output["tool_choice"], "required");
    }

    #[test]
    fn request_removes_tool_choice_when_tools_empty() {
        let input = json!({
            "tools": [],
            "tool_choice": "auto"
        });
        let output = normalize_request_tool_choice_policy(&input);
        assert_eq!(output, json!({"tools": []}));
    }

    #[test]
    fn request_removes_tool_choice_when_tools_missing() {
        let input = json!({
            "tool_choice": "auto"
        });
        let output = normalize_request_tool_choice_policy(&input);
        assert_eq!(output, json!({}));
    }

    #[test]
    fn response_sets_finish_reason_and_content_when_tool_calls_exist() {
        let input = json!({
            "choices": [
                {
                    "message": {
                        "content": "text",
                        "tool_calls": [{"id": "1"}]
                    }
                }
            ]
        });
        let output = normalize_response_finish_invariants(&input);
        assert_eq!(
            output,
            json!({
                "choices": [
                    {
                        "finish_reason": "tool_calls",
                        "message": {
                            "content": null,
                            "tool_calls": [{"id": "1"}]
                        }
                    }
                ]
            })
        );
    }

    #[test]
    fn response_keeps_existing_finish_reason() {
        let input = json!({
            "choices": [
                {
                    "finish_reason": "stop",
                    "message": {
                        "content": "text",
                        "tool_calls": [{"id": "1"}]
                    }
                }
            ]
        });
        let output = normalize_response_finish_invariants(&input);
        assert_eq!(output["choices"][0]["finish_reason"], "stop");
        assert!(output["choices"][0]["message"]["content"].is_null());
    }

    #[test]
    fn response_leaves_choices_without_tool_calls_unchanged() {
        let input = json!({
            "choices": [
                {
                    "finish_reason": "stop",
                    "message": {
                        "content": "text"
                    }
                }
            ]
        });
        let output = normalize_response_finish_invariants(&input);
        assert_eq!(output, input);
    }
}
