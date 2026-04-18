use serde_json::Value;

pub use crate::message_content_text::{
    extract_captured_message_text, extract_text_from_message_content,
};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BlockedReport {
    pub summary: String,
    pub blocker: String,
    pub impact: Option<String>,
    pub next_action: Option<String>,
    pub evidence: Vec<String>,
}

const BLOCKED_TEXT_SCAN_LIMIT: usize = 12;
const BLOCKED_CANDIDATE_MAX_LENGTH: usize = 12_000;

pub fn extract_blocked_report_from_messages(messages: &[Value]) -> Option<BlockedReport> {
    if messages.is_empty() {
        return None;
    }
    let start = messages.len().saturating_sub(BLOCKED_TEXT_SCAN_LIMIT);
    for idx in (start..messages.len()).rev() {
        let text = extract_captured_message_text(&messages[idx]);
        if text.is_empty() {
            continue;
        }
        if let Some(report) = extract_blocked_report_from_text(&text) {
            return Some(report);
        }
    }
    None
}

pub fn extract_blocked_report_from_text(text: &str) -> Option<BlockedReport> {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return None;
    }

    let mut candidates = Vec::new();
    push_candidate(&mut candidates, trimmed);
    for code_block in extract_json_code_blocks(trimmed) {
        push_candidate(&mut candidates, &code_block);
    }
    for object_text in extract_balanced_json_object_strings(trimmed) {
        if object_text.contains("\"type\"") && object_text.to_lowercase().contains("\"blocked\"") {
            push_candidate(&mut candidates, &object_text);
        }
    }

    for candidate in candidates {
        if let Ok(parsed) = serde_json::from_str::<Value>(&candidate) {
            if let Some(report) = normalize_blocked_report(&parsed) {
                return Some(report);
            }
        }
    }
    None
}

fn push_candidate(candidates: &mut Vec<String>, candidate: &str) {
    let normalized = candidate.trim();
    if normalized.is_empty() || normalized.len() > BLOCKED_CANDIDATE_MAX_LENGTH {
        return;
    }
    if !candidates.iter().any(|existing| existing == normalized) {
        candidates.push(normalized.to_string());
    }
}

pub fn normalize_blocked_report(value: &Value) -> Option<BlockedReport> {
    if let Value::Array(entries) = value {
        for entry in entries {
            if let Some(report) = normalize_blocked_report(entry) {
                return Some(report);
            }
        }
        return None;
    }

    let record = value.as_object()?;
    let type_name = to_non_empty_text(record.get("type").unwrap_or(&Value::Null)).to_lowercase();
    if type_name != "blocked" {
        return None;
    }

    let summary = first_non_empty_text(&[
        record.get("summary"),
        record.get("title"),
        record.get("problem"),
    ]);
    let blocker = first_non_empty_text(&[
        record.get("blocker"),
        record.get("reason"),
        record.get("blocked_by"),
    ]);
    if summary.is_empty() || blocker.is_empty() {
        return None;
    }

    let impact = first_non_empty_text(&[record.get("impact"), record.get("effect")]);
    let next_action = first_non_empty_text(&[
        record.get("next_action"),
        record.get("nextAction"),
        record.get("next_step"),
    ]);
    let evidence = normalize_blocked_evidence(record.get("evidence").unwrap_or(&Value::Null));

    Some(BlockedReport {
        summary: summary.chars().take(1000).collect(),
        blocker: blocker.chars().take(1000).collect(),
        impact: (!impact.is_empty()).then(|| impact.chars().take(1000).collect()),
        next_action: (!next_action.is_empty()).then(|| next_action.chars().take(1000).collect()),
        evidence,
    })
}

fn first_non_empty_text(values: &[Option<&Value>]) -> String {
    values
        .iter()
        .flatten()
        .map(|value| to_non_empty_text(value))
        .find(|text| !text.is_empty())
        .unwrap_or_default()
}

fn normalize_blocked_evidence(raw: &Value) -> Vec<String> {
    if let Value::Array(items) = raw {
        return items
            .iter()
            .map(to_non_empty_text)
            .filter(|entry| !entry.is_empty())
            .map(|entry| entry.chars().take(800).collect())
            .take(8)
            .collect();
    }
    let single = to_non_empty_text(raw);
    if single.is_empty() {
        Vec::new()
    } else {
        vec![single.chars().take(800).collect()]
    }
}

fn extract_json_code_blocks(text: &str) -> Vec<String> {
    let mut out = Vec::new();
    let mut remainder = text;
    while let Some(start) = remainder.find("```") {
        let after_fence = &remainder[start + 3..];
        let after_prefix = after_fence
            .strip_prefix("json")
            .or_else(|| after_fence.strip_prefix("JSON"))
            .unwrap_or(after_fence);
        if let Some(end) = after_prefix.find("```") {
            let body = after_prefix[..end].trim();
            if !body.is_empty() {
                out.push(body.to_string());
            }
            remainder = &after_prefix[end + 3..];
        } else {
            break;
        }
    }
    out
}

fn extract_balanced_json_object_strings(text: &str) -> Vec<String> {
    let mut results = Vec::new();
    let mut start: Option<usize> = None;
    let mut depth = 0usize;
    let mut in_string = false;
    let mut escaped = false;

    for (idx, ch) in text.char_indices() {
        if in_string {
            if escaped {
                escaped = false;
            } else if ch == '\\' {
                escaped = true;
            } else if ch == '"' {
                in_string = false;
            }
            continue;
        }

        if ch == '"' {
            in_string = true;
            continue;
        }

        if ch == '{' {
            if depth == 0 {
                start = Some(idx);
            }
            depth += 1;
            continue;
        }

        if ch == '}' {
            if depth == 0 {
                continue;
            }
            depth -= 1;
            if depth == 0 {
                if let Some(start_idx) = start.take() {
                    results.push(text[start_idx..idx + ch.len_utf8()].to_string());
                }
            }
        }
    }

    results
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
        extract_blocked_report_from_messages, extract_blocked_report_from_text,
        extract_captured_message_text, extract_text_from_message_content, normalize_blocked_report,
        BlockedReport,
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
    fn normalizes_blocked_report_from_object_or_array() {
        let report = normalize_blocked_report(&json!({
            "type":"blocked",
            "title":"summary",
            "reason":"blocker",
            "effect":"impact",
            "next_step":"next",
            "evidence":["e1","e2"]
        }))
        .unwrap();
        assert_eq!(
            report,
            BlockedReport {
                summary: "summary".to_string(),
                blocker: "blocker".to_string(),
                impact: Some("impact".to_string()),
                next_action: Some("next".to_string()),
                evidence: vec!["e1".to_string(), "e2".to_string()],
            }
        );

        let nested = normalize_blocked_report(&json!([
            {"type":"note"},
            {"type":"blocked","summary":"s","blocker":"b"}
        ]));
        assert!(nested.is_some());
    }

    #[test]
    fn parses_blocked_report_from_raw_json_and_code_block() {
        let raw = r#"{"type":"blocked","summary":"s","blocker":"b","evidence":"ev"}"#;
        assert_eq!(
            extract_blocked_report_from_text(raw).unwrap().evidence,
            vec!["ev".to_string()]
        );

        let wrapped = r#"
before
```json
{"type":"blocked","summary":"s2","blocker":"b2"}
```
after
"#;
        let parsed = extract_blocked_report_from_text(wrapped).unwrap();
        assert_eq!(parsed.summary, "s2");
        assert_eq!(parsed.blocker, "b2");
    }

    #[test]
    fn parses_blocked_report_from_balanced_json_inside_text() {
        let text = r#"prefix {"type":"blocked","summary":"hello","blocker":"world"} suffix"#;
        let parsed = extract_blocked_report_from_text(text).unwrap();
        assert_eq!(parsed.summary, "hello");
        assert_eq!(parsed.blocker, "world");
    }

    #[test]
    fn scans_recent_messages_for_blocked_report() {
        let messages = vec![
            json!({"content":"old"}),
            json!({"content":"{\"type\":\"blocked\",\"summary\":\"s\",\"blocker\":\"b\"}"}),
        ];
        let parsed = extract_blocked_report_from_messages(&messages).unwrap();
        assert_eq!(parsed.summary, "s");
        assert_eq!(parsed.blocker, "b");
    }
}
