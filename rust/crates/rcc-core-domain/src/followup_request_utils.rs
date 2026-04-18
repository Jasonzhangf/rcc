use serde_json::{Map, Value};

const ALLOWED_TOP_LEVEL_PARAMETER_KEYS: [&str; 9] = [
    "temperature",
    "top_p",
    "max_output_tokens",
    "seed",
    "logit_bias",
    "user",
    "parallel_tool_calls",
    "tool_choice",
    "response_format",
];

pub fn resolve_followup_model(seed_model: &Value, adapter_context: &Value) -> String {
    if !adapter_context.is_object() {
        return seed_model
            .as_str()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .unwrap_or("")
            .to_string();
    }

    let record = adapter_context.as_object().expect("object");
    for value in [
        record.get("assignedModelId"),
        record.get("modelId"),
        Some(seed_model),
        record.get("model"),
        record.get("originalModelId"),
    ] {
        if let Some(model) = value
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|value| !value.is_empty())
        {
            return model.to_string();
        }
    }

    String::new()
}

pub fn extract_responses_top_level_parameters(
    record: &Map<String, Value>,
) -> Option<Map<String, Value>> {
    let mut out = Map::new();

    if !record.contains_key("max_output_tokens") {
        if let Some(value) = record.get("max_tokens") {
            out.insert("max_output_tokens".to_string(), value.clone());
        }
    }

    for key in ALLOWED_TOP_LEVEL_PARAMETER_KEYS {
        if let Some(value) = record.get(key) {
            out.insert(key.to_string(), value.clone());
        }
    }

    if out.is_empty() {
        None
    } else {
        Some(out)
    }
}

pub fn normalize_followup_parameters(value: &Value) -> Option<Map<String, Value>> {
    let mut cloned = value.as_object()?.clone();
    cloned.remove("stream");
    cloned.remove("tool_choice");

    if cloned.is_empty() {
        None
    } else {
        Some(cloned)
    }
}

pub fn drop_tool_by_function_name(tools: &Value, drop_name: &str) -> Option<Vec<Value>> {
    let tools = tools.as_array()?;
    let name = drop_name.trim();
    if name.is_empty() {
        return Some(tools.clone());
    }

    let filtered = tools
        .iter()
        .filter_map(|tool| {
            let record = tool.as_object()?;
            let function = record.get("function").and_then(Value::as_object);
            let tool_name = function
                .and_then(|function| function.get("name"))
                .and_then(Value::as_str)
                .unwrap_or("");
            if tool_name.is_empty() || tool_name != name {
                Some(Value::Object(record.clone()))
            } else {
                None
            }
        })
        .collect::<Vec<_>>();

    Some(filtered)
}

#[cfg(test)]
mod tests {
    use super::{
        drop_tool_by_function_name, extract_responses_top_level_parameters,
        normalize_followup_parameters, resolve_followup_model,
    };
    use serde_json::json;

    #[test]
    fn resolve_followup_model_uses_seed_when_context_missing() {
        assert_eq!(
            resolve_followup_model(&json!(" gpt-5 "), &json!(null)),
            "gpt-5"
        );
        assert_eq!(resolve_followup_model(&json!(null), &json!(null)), "");
    }

    #[test]
    fn resolve_followup_model_uses_priority_order() {
        let context = json!({
            "assignedModelId": " assigned ",
            "modelId": "model-id",
            "model": "fallback-model",
            "originalModelId": "original"
        });
        assert_eq!(
            resolve_followup_model(&json!("seed-model"), &context),
            "assigned"
        );

        let context_without_assigned = json!({
            "modelId": "model-id",
            "model": "fallback-model",
            "originalModelId": "original"
        });
        assert_eq!(
            resolve_followup_model(&json!("seed-model"), &context_without_assigned),
            "model-id"
        );
    }

    #[test]
    fn extracts_allowed_responses_top_level_parameters_with_back_compat_mapping() {
        let record = json!({
            "temperature": 0.2,
            "max_tokens": 123,
            "user": "abc",
            "stream": true,
            "ignored": "x"
        });
        let result = extract_responses_top_level_parameters(record.as_object().expect("object"))
            .expect("parameters");
        assert_eq!(result.get("temperature"), Some(&json!(0.2)));
        assert_eq!(result.get("user"), Some(&json!("abc")));
        assert_eq!(result.get("max_output_tokens"), Some(&json!(123)));
        assert!(!result.contains_key("stream"));
        assert!(!result.contains_key("ignored"));
    }

    #[test]
    fn normalize_followup_parameters_drops_stream_and_tool_choice() {
        let value = json!({
            "stream": true,
            "tool_choice": "auto",
            "temperature": 0.1
        });
        let result = normalize_followup_parameters(&value).expect("normalized");
        assert_eq!(result.get("temperature"), Some(&json!(0.1)));
        assert!(!result.contains_key("stream"));
        assert!(!result.contains_key("tool_choice"));
    }

    #[test]
    fn normalize_followup_parameters_returns_none_when_empty_or_invalid() {
        assert!(normalize_followup_parameters(&json!(null)).is_none());
        assert!(normalize_followup_parameters(&json!({"stream": true})).is_none());
    }

    #[test]
    fn drop_tool_by_function_name_filters_only_matching_named_tools() {
        let tools = json!([
            {"type": "function", "function": {"name": "keep"}},
            {"type": "function", "function": {"name": "dropme"}},
            {"type": "function", "function": {}},
            "invalid"
        ]);
        let filtered = drop_tool_by_function_name(&tools, "dropme").expect("filtered");
        assert_eq!(filtered.len(), 2);
        assert_eq!(filtered[0]["function"]["name"], json!("keep"));
        assert!(filtered[1]["function"].get("name").is_none());
    }

    #[test]
    fn drop_tool_by_function_name_keeps_copy_when_drop_name_blank() {
        let tools = json!([{"type": "function", "function": {"name": "keep"}}]);
        let filtered = drop_tool_by_function_name(&tools, "  ").expect("filtered");
        assert_eq!(filtered, tools.as_array().expect("array").clone());
    }
}
