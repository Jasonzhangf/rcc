use regex::Regex;
use serde_json::Value;
use std::sync::OnceLock;

const REASONING_TEXT_MARKERS: [&str; 6] = [
    "<think",
    "</think",
    "<reflection",
    "</reflection",
    "```think",
    "```reflection",
];

pub fn value_may_contain_reasoning_markup(value: &Value) -> bool {
    match value {
        Value::String(text) => string_has_reasoning_marker(text),
        Value::Array(entries) => entries.iter().any(value_may_contain_reasoning_markup),
        Value::Object(record) => record.values().any(value_may_contain_reasoning_markup),
        _ => false,
    }
}

pub fn strip_reasoning_transport_noise(text: &str) -> String {
    let without_noise = reasoning_transport_noise_line_re().replace_all(text, "");
    let without_open = reasoning_wrapper_open_re().replace(&without_noise, "");
    let without_close = reasoning_wrapper_close_re().replace(&without_open, "");
    collapse_extra_newlines_re()
        .replace_all(&without_close, "\n\n")
        .trim()
        .to_string()
}

fn string_has_reasoning_marker(value: &str) -> bool {
    let lower = value.to_ascii_lowercase();
    REASONING_TEXT_MARKERS
        .iter()
        .any(|marker| lower.contains(marker))
}

fn reasoning_transport_noise_line_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"(?im)^\[(?:Time/Date)\]:.*$").expect("valid regex"))
}

fn reasoning_wrapper_open_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"(?i)^\s*\[(?:思考|thinking)\]\s*").expect("valid regex"))
}

fn reasoning_wrapper_close_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"(?i)\s*\[/(?:思考|thinking)\]\s*$").expect("valid regex"))
}

fn collapse_extra_newlines_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"\n{3,}").expect("valid regex"))
}

#[cfg(test)]
mod tests {
    use super::{strip_reasoning_transport_noise, value_may_contain_reasoning_markup};
    use serde_json::json;

    #[test]
    fn detects_reasoning_markup_in_strings_case_insensitively() {
        assert!(value_may_contain_reasoning_markup(&json!(
            "prefix <THINK>hidden</THINK> suffix"
        )));
        assert!(value_may_contain_reasoning_markup(&json!(
            "```Reflection\nx"
        )));
        assert!(!value_may_contain_reasoning_markup(&json!("plain text")));
    }

    #[test]
    fn detects_reasoning_markup_recursively_in_arrays_and_objects() {
        let payload = json!({
            "messages": [
                {"content": "plain"},
                {"content": [{"text": "nope"}, {"text": "<reflection>step</reflection>"}]}
            ]
        });
        assert!(value_may_contain_reasoning_markup(&payload));
        assert!(!value_may_contain_reasoning_markup(&json!({
            "messages": [{"content": "plain"}],
            "count": 2,
            "ok": true
        })));
    }

    #[test]
    fn non_string_scalars_do_not_report_markup() {
        assert!(!value_may_contain_reasoning_markup(&json!(null)));
        assert!(!value_may_contain_reasoning_markup(&json!(42)));
        assert!(!value_may_contain_reasoning_markup(&json!(false)));
        assert!(!value_may_contain_reasoning_markup(&json!({})));
    }

    #[test]
    fn strips_transport_noise_and_wrappers() {
        let input = "  [thinking]\n[Time/Date]: 2026-04-17\nLine 1\n\n\nLine 2\n[/thinking]  ";
        assert_eq!(strip_reasoning_transport_noise(input), "Line 1\n\nLine 2");
    }

    #[test]
    fn strips_chinese_wrapper_and_trims_result() {
        let input = "\n[思考]  \nHello\n[/思考]\n";
        assert_eq!(strip_reasoning_transport_noise(input), "Hello");
    }
}
