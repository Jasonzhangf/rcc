use serde_json::Value;

pub fn compact_tool_content_value(value: &Value, max_chars: usize) -> String {
    let text = stringify_tool_content(value);
    let text_len = text.chars().count();
    if text_len <= max_chars {
        return text;
    }

    let keep_head = 24usize.max(((max_chars as f64) * 0.45).floor() as usize);
    let keep_tail = 24usize.max(((max_chars as f64) * 0.35).floor() as usize);
    let omitted = text_len.saturating_sub(keep_head + keep_tail);
    let head = take_first_chars(&text, keep_head);
    let tail = take_last_chars(&text, keep_tail);

    format!("{head}\n...[tool_output_compacted omitted={omitted}]...\n{tail}")
}

pub fn compact_tool_content_in_messages(messages: &[Value], max_chars: Option<f64>) -> Vec<Value> {
    let max_chars = max_chars
        .filter(|value| value.is_finite())
        .map(|value| 64usize.max(value.floor() as usize))
        .unwrap_or(1200);

    messages
        .iter()
        .map(|message| {
            let Some(record) = message.as_object() else {
                return message.clone();
            };
            let role = record
                .get("role")
                .and_then(Value::as_str)
                .map(|value| value.trim().to_ascii_lowercase())
                .unwrap_or_default();
            if role != "tool" {
                return message.clone();
            }

            let mut next = record.clone();
            let compacted =
                compact_tool_content_value(next.get("content").unwrap_or(&Value::Null), max_chars);
            next.insert("content".to_string(), Value::String(compacted));
            Value::Object(next)
        })
        .collect()
}

fn stringify_tool_content(value: &Value) -> String {
    match value {
        Value::String(text) => text.clone(),
        Value::Null => serde_json::to_string("").expect("json string"),
        _ => serde_json::to_string(value).unwrap_or_else(|_| value.to_string()),
    }
}

fn take_first_chars(text: &str, count: usize) -> String {
    text.chars().take(count).collect()
}

fn take_last_chars(text: &str, count: usize) -> String {
    let len = text.chars().count();
    text.chars().skip(len.saturating_sub(count)).collect()
}

#[cfg(test)]
mod tests {
    use super::{compact_tool_content_in_messages, compact_tool_content_value};
    use serde_json::json;

    #[test]
    fn compact_value_returns_original_when_within_limit() {
        assert_eq!(
            compact_tool_content_value(&json!("hello"), 10),
            "hello".to_string()
        );
    }

    #[test]
    fn compact_value_compacts_long_text_with_marker() {
        let input = json!("abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ");
        let result = compact_tool_content_value(&input, 40);
        assert!(result.contains("[tool_output_compacted omitted="));
        assert!(result.starts_with("abcdefghijklmnopqrstuvwx"));
        assert!(result.ends_with("QRSTUVWXYZ"));
    }

    #[test]
    fn compact_value_stringifies_non_string_content() {
        let input = json!({"ok": true, "count": 2});
        let result = compact_tool_content_value(&input, 200);
        assert_eq!(result, "{\"count\":2,\"ok\":true}".to_string());
    }

    #[test]
    fn compact_messages_only_rewrites_tool_role() {
        let long = "x".repeat(120);
        let messages = vec![
            json!({"role": "tool", "content": long}),
            json!({"role": "assistant", "content": "keep"}),
            json!("invalid"),
        ];
        let result = compact_tool_content_in_messages(&messages, Some(64.0));
        assert!(result[0]["content"]
            .as_str()
            .expect("string")
            .contains("[tool_output_compacted omitted="));
        assert_eq!(result[1]["content"], json!("keep"));
        assert_eq!(result[2], json!("invalid"));
    }

    #[test]
    fn compact_messages_clamps_invalid_or_small_max_chars() {
        let long = "y".repeat(120);
        let messages = vec![json!({"role": " TOOL ", "content": long})];
        let invalid_result = compact_tool_content_in_messages(&messages, Some(f64::NAN));
        assert_eq!(
            invalid_result[0]["content"].as_str().expect("string").len(),
            120
        );

        let clamped_result = compact_tool_content_in_messages(&messages, Some(10.0));
        assert!(clamped_result[0]["content"]
            .as_str()
            .expect("string")
            .contains("[tool_output_compacted omitted="));
    }
}
