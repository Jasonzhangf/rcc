use serde_json::Value;

pub fn extract_captured_message_text(message: &Value) -> String {
    match message {
        Value::String(text) => text.trim().to_string(),
        Value::Object(record) => {
            for key in ["content", "input", "output"] {
                if let Some(value) = record.get(key) {
                    let text = extract_text_from_message_content(value);
                    if !text.is_empty() {
                        return text;
                    }
                }
            }
            to_non_empty_text(record.get("arguments").unwrap_or(&Value::Null))
        }
        _ => String::new(),
    }
}

pub fn extract_text_from_message_content(content: &Value) -> String {
    match content {
        Value::String(text) => text.trim().to_string(),
        Value::Array(items) => {
            let mut chunks = Vec::new();
            for item in items {
                match item {
                    Value::String(text) => {
                        let trimmed = text.trim();
                        if !trimmed.is_empty() {
                            chunks.push(trimmed.to_string());
                        }
                    }
                    Value::Object(record) => {
                        let type_name =
                            to_non_empty_text(record.get("type").unwrap_or(&Value::Null))
                                .to_lowercase();
                        if type_name.is_empty()
                            || type_name == "text"
                            || type_name == "output_text"
                            || type_name == "input_text"
                        {
                            let text =
                                to_non_empty_text(record.get("text").unwrap_or(&Value::Null));
                            if !text.is_empty() {
                                chunks.push(text);
                                continue;
                            }
                        }
                        let fallback_text = [
                            record.get("content"),
                            record.get("value"),
                            record.get("input"),
                            record.get("arguments"),
                            record.get("args"),
                            record.get("patch"),
                            record.get("payload"),
                        ]
                        .into_iter()
                        .flatten()
                        .map(extract_unknown_text)
                        .find(|text| !text.is_empty())
                        .unwrap_or_default();
                        if !fallback_text.is_empty() {
                            chunks.push(fallback_text);
                        }
                    }
                    _ => {}
                }
            }
            chunks.join("\n").trim().to_string()
        }
        _ => String::new(),
    }
}

pub fn extract_unknown_text(value: &Value) -> String {
    extract_unknown_text_inner(value, 0)
}

fn extract_unknown_text_inner(value: &Value, depth: usize) -> String {
    if depth > 4 {
        return String::new();
    }
    match value {
        Value::String(text) => text.trim().to_string(),
        Value::Number(number) => number.to_string(),
        Value::Bool(boolean) => boolean.to_string(),
        Value::Array(items) => {
            let parts: Vec<String> = items
                .iter()
                .map(|entry| extract_unknown_text_inner(entry, depth + 1))
                .filter(|entry| !entry.is_empty())
                .collect();
            dedupe_and_join_texts(&parts)
        }
        Value::Object(record) => {
            let priority_keys = [
                "text",
                "content",
                "value",
                "input",
                "arguments",
                "args",
                "patch",
                "payload",
                "summary",
                "reasoning",
                "thinking",
                "analysis",
            ];
            let mut parts = Vec::new();
            for key in priority_keys {
                if let Some(entry) = record.get(key) {
                    let text = extract_unknown_text_inner(entry, depth + 1);
                    if !text.is_empty() {
                        parts.push(text);
                    }
                }
            }
            dedupe_and_join_texts(&parts)
        }
        _ => String::new(),
    }
}

fn dedupe_and_join_texts(parts: &[String]) -> String {
    let mut unique = Vec::new();
    for entry in parts {
        let trimmed = entry.trim();
        if trimmed.is_empty() {
            continue;
        }
        if !unique.iter().any(|existing: &String| existing == trimmed) {
            unique.push(trimmed.to_string());
        }
    }
    unique.join("\n").trim().to_string()
}

fn to_non_empty_text(value: &Value) -> String {
    value
        .as_str()
        .map(|text| text.trim().to_string())
        .filter(|text| !text.is_empty())
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::{
        extract_captured_message_text, extract_text_from_message_content, extract_unknown_text,
    };
    use serde_json::json;

    #[test]
    fn extracts_message_text_from_common_fields() {
        assert_eq!(
            extract_captured_message_text(&json!({"content":" hello "})),
            "hello"
        );
        assert_eq!(
            extract_captured_message_text(
                &json!({"input":[{"type":"text","text":"A"},{"value":"B"}]})
            ),
            "A\nB"
        );
        assert_eq!(
            extract_captured_message_text(&json!({"arguments":" {\\\"k\\\":1} "})),
            "{\\\"k\\\":1}"
        );
    }

    #[test]
    fn extracts_text_from_array_content_with_fallbacks() {
        let content = json!([
            "a",
            {"type":"text","text":"b"},
            {"type":"other","payload":{"summary":"c","summary_dup":"c"}},
            {"type":"other","arguments":["d","d"]}
        ]);
        assert_eq!(extract_text_from_message_content(&content), "a\nb\nc\nd");
    }

    #[test]
    fn extracts_unknown_text_recursively_with_dedupe() {
        let value = json!({
            "payload": [
                {"text":"a"},
                {"content":"a"},
                {"arguments":{"summary":"b"}},
                {"args":[true, true, 3]}
            ]
        });
        assert_eq!(extract_unknown_text(&value), "a\nb\ntrue\n3");
    }
}
