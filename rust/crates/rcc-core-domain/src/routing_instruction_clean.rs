use regex::Regex;
use serde_json::{Map, Value};
use std::sync::LazyLock;

static FENCED_BACKTICK_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?s)```.*?```").expect("valid fenced backtick regex"));
static FENCED_TILDE_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?s)~~~.*?~~~").expect("valid fenced tilde regex"));
static INLINE_CODE_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"`[^`]*`").expect("valid inline code regex"));
static ROUTING_MARKER_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?s)<\*\*[\s\S]*?\*\*>").expect("valid routing marker regex"));

pub fn strip_code_segments(text: &str) -> String {
    if text.is_empty() {
        return String::new();
    }

    let sanitized = FENCED_BACKTICK_RE.replace_all(text, " ");
    let sanitized = FENCED_TILDE_RE.replace_all(&sanitized, " ");
    INLINE_CODE_RE.replace_all(&sanitized, " ").into_owned()
}

pub fn clean_messages_from_routing_instructions(
    messages: &[Map<String, Value>],
) -> Vec<Map<String, Value>> {
    messages
        .iter()
        .filter_map(|message| {
            let role = message.get("role").and_then(Value::as_str);
            let content = message.get("content").and_then(Value::as_str);

            if role != Some("user") || content.is_none() {
                return Some(message.clone());
            }

            let cleaned = ROUTING_MARKER_RE
                .replace_all(content.unwrap_or_default(), "")
                .trim()
                .to_string();
            if cleaned.is_empty() {
                return None;
            }

            let mut next = message.clone();
            next.insert("content".to_string(), Value::String(cleaned));
            Some(next)
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::{clean_messages_from_routing_instructions, strip_code_segments};
    use serde_json::{json, Map, Value};

    fn message(value: Value) -> Map<String, Value> {
        value.as_object().cloned().expect("object")
    }

    #[test]
    fn strip_code_segments_returns_empty_for_empty_input() {
        assert_eq!(strip_code_segments(""), "");
    }

    #[test]
    fn strip_code_segments_removes_fenced_and_inline_code() {
        let raw =
            "before ```ts\nconst a = 1;\n``` middle ~~~bash\necho hi\n~~~ after `inline()` done";
        assert_eq!(strip_code_segments(raw), "before   middle   after   done");
    }

    #[test]
    fn clean_messages_updates_only_user_string_content() {
        let input = vec![
            message(json!({"role": "user", "content": " hi <** force:gpt-5 **> there "})),
            message(json!({"role": "assistant", "content": "<** keep **>"})),
            message(json!({"role": "user", "content": [{"type": "text", "text": "<**x**>"}]})),
        ];

        let output = clean_messages_from_routing_instructions(&input);
        assert_eq!(output.len(), 3);
        assert_eq!(
            output[0].get("content"),
            Some(&Value::String("hi  there".to_string()))
        );
        assert_eq!(output[1], input[1]);
        assert_eq!(output[2], input[2]);
    }

    #[test]
    fn clean_messages_drops_user_messages_empty_after_clean() {
        let input = vec![
            message(json!({"role": "user", "content": "  <** clear **>  "})),
            message(json!({"role": "system", "content": "keep"})),
        ];

        let output = clean_messages_from_routing_instructions(&input);
        assert_eq!(output.len(), 1);
        assert_eq!(output[0], input[1]);
    }

    #[test]
    fn clean_messages_keeps_non_string_or_non_user_messages() {
        let input = vec![
            message(json!({"role": "tool", "content": "<** should stay **>"})),
            message(json!({"role": "user", "content": 42})),
            message(json!({"content": "missing role"})),
        ];

        let output = clean_messages_from_routing_instructions(&input);
        assert_eq!(output, input);
    }
}
