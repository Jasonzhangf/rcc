use regex::Regex;
use serde_json::Value;
use std::sync::LazyLock;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MarkerSyntaxMatch {
    pub raw: String,
    pub body: String,
    pub start: usize,
    pub end: usize,
    pub terminated: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StripMarkerSyntaxResult {
    pub text: String,
    pub markers: Vec<MarkerSyntaxMatch>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StripMarkerContentResult {
    pub content: Value,
    pub markers: Vec<MarkerSyntaxMatch>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StripMarkerMessagesResult {
    pub messages: Vec<Value>,
    pub markers: Vec<MarkerSyntaxMatch>,
    pub changed: bool,
}

static TRAILING_SPACE_BEFORE_NEWLINE_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"[ \t]+\n").expect("valid trailing whitespace regex"));
static EXCESSIVE_BLANK_LINES_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\n{3,}").expect("valid blank-line regex"));

fn compact_marker_whitespace(raw: &str) -> String {
    let without_trailing_spaces = TRAILING_SPACE_BEFORE_NEWLINE_RE.replace_all(raw, "\n");
    EXCESSIVE_BLANK_LINES_RE
        .replace_all(&without_trailing_spaces, "\n\n")
        .trim()
        .to_string()
}

pub fn strip_marker_syntax_from_text(raw: &str) -> StripMarkerSyntaxResult {
    let source = raw.to_string();
    if !source.contains("<**") {
        return StripMarkerSyntaxResult {
            text: source,
            markers: Vec::new(),
        };
    }

    let mut markers = Vec::new();
    let mut output = String::new();
    let mut cursor = 0usize;

    while cursor < source.len() {
        let remainder = &source[cursor..];
        let Some(relative_start) = remainder.find("<**") else {
            output.push_str(remainder);
            break;
        };
        let marker_start = cursor + relative_start;
        output.push_str(&source[cursor..marker_start]);

        let body_search_start = marker_start + 3;
        let close_index = source[body_search_start..]
            .find("**>")
            .map(|idx| body_search_start + idx);
        let newline_index = source[body_search_start..]
            .find('\n')
            .map(|idx| body_search_start + idx);
        let has_closed_marker = match (close_index, newline_index) {
            (Some(close), Some(newline)) => close < newline,
            (Some(_), None) => true,
            _ => false,
        };
        let marker_end = if has_closed_marker {
            close_index.unwrap() + 3
        } else {
            newline_index.unwrap_or(source.len())
        };
        let raw_marker = source[marker_start..marker_end].to_string();
        let body = if has_closed_marker {
            source[body_search_start..close_index.unwrap()].to_string()
        } else {
            source[body_search_start..marker_end].to_string()
        };
        markers.push(MarkerSyntaxMatch {
            raw: raw_marker,
            body,
            start: marker_start,
            end: marker_end,
            terminated: has_closed_marker,
        });
        cursor = marker_end;
    }

    StripMarkerSyntaxResult {
        text: compact_marker_whitespace(&output),
        markers,
    }
}

pub fn strip_marker_syntax_from_content(content: &Value) -> StripMarkerContentResult {
    match content {
        Value::String(text) => {
            let stripped = strip_marker_syntax_from_text(text);
            StripMarkerContentResult {
                content: Value::String(stripped.text),
                markers: stripped.markers,
            }
        }
        Value::Array(parts) => {
            let mut markers = Vec::new();
            let mut changed = false;
            let next_parts: Vec<Value> = parts
                .iter()
                .map(|part| match part {
                    Value::String(text) => {
                        let stripped = strip_marker_syntax_from_text(text);
                        if !stripped.markers.is_empty() {
                            changed = true;
                            markers.extend(stripped.markers.clone());
                            Value::String(stripped.text)
                        } else {
                            part.clone()
                        }
                    }
                    Value::Object(obj) => {
                        let mut next = obj.clone();
                        let mut local_changed = false;
                        for key in ["text", "content"] {
                            if let Some(Value::String(value)) = next.get(key) {
                                if value.contains("<**") {
                                    let stripped = strip_marker_syntax_from_text(value);
                                    if !stripped.markers.is_empty() {
                                        next.insert(key.to_string(), Value::String(stripped.text));
                                        markers.extend(stripped.markers.clone());
                                        local_changed = true;
                                    }
                                }
                            }
                        }
                        if local_changed {
                            changed = true;
                            Value::Object(next)
                        } else {
                            part.clone()
                        }
                    }
                    _ => part.clone(),
                })
                .collect();
            StripMarkerContentResult {
                content: if changed {
                    Value::Array(next_parts)
                } else {
                    content.clone()
                },
                markers,
            }
        }
        _ => StripMarkerContentResult {
            content: content.clone(),
            markers: Vec::new(),
        },
    }
}

pub fn strip_marker_syntax_from_messages(messages: &[Value]) -> StripMarkerMessagesResult {
    let mut markers = Vec::new();
    let mut changed = false;
    let next_messages: Vec<Value> = messages
        .iter()
        .map(|message| {
            let Some(obj) = message.as_object() else {
                return message.clone();
            };
            let content = obj.get("content").unwrap_or(&Value::Null);
            let stripped = strip_marker_syntax_from_content(content);
            if stripped.markers.is_empty() {
                return message.clone();
            }
            changed = true;
            markers.extend(stripped.markers.clone());
            let mut next = obj.clone();
            next.insert("content".to_string(), stripped.content);
            Value::Object(next)
        })
        .collect();

    StripMarkerMessagesResult {
        messages: if changed {
            next_messages
        } else {
            messages.to_vec()
        },
        markers,
        changed,
    }
}

pub fn has_marker_syntax(raw: &str) -> bool {
    raw.contains("<**")
}

#[cfg(test)]
mod tests {
    use super::{
        has_marker_syntax, strip_marker_syntax_from_content, strip_marker_syntax_from_messages,
        strip_marker_syntax_from_text,
    };
    use serde_json::json;

    #[test]
    fn text_without_markers_is_unchanged() {
        let result = strip_marker_syntax_from_text("hello");
        assert_eq!(result.text, "hello");
        assert!(result.markers.is_empty());
        assert!(!has_marker_syntax("hello"));
    }

    #[test]
    fn strips_terminated_and_unterminated_markers() {
        let result = strip_marker_syntax_from_text("a <**x**> b\n<**y\nc");
        assert_eq!(result.text, "a  b\n\nc");
        assert_eq!(result.markers.len(), 2);
        assert!(result.markers[0].terminated);
        assert!(!result.markers[1].terminated);
        assert_eq!(result.markers[0].body, "x");
        assert_eq!(result.markers[1].body, "y");
    }

    #[test]
    fn compacts_whitespace_after_strip() {
        let result = strip_marker_syntax_from_text("a   \n<**x**>\n\n\nb  ");
        assert_eq!(result.text, "a\n\nb");
    }

    #[test]
    fn strips_markers_from_string_content() {
        let result = strip_marker_syntax_from_content(&json!("hello <**m**> world"));
        assert_eq!(result.content, json!("hello  world"));
        assert_eq!(result.markers.len(), 1);
    }

    #[test]
    fn strips_markers_from_array_content_parts() {
        let content = json!([
            "a <**x**>",
            {"type":"text","text":"b <**y**>"},
            {"type":"other","content":"c <**z**>"},
            {"type":"image","url":"keep"}
        ]);
        let result = strip_marker_syntax_from_content(&content);
        assert_eq!(
            result.content,
            json!([
                "a",
                {"type":"text","text":"b"},
                {"type":"other","content":"c"},
                {"type":"image","url":"keep"}
            ])
        );
        assert_eq!(result.markers.len(), 3);
    }

    #[test]
    fn strips_markers_from_messages_only_when_needed() {
        let messages = vec![
            json!({"role":"user","content":"plain"}),
            json!({"role":"assistant","content":"hi <**secret**> there"}),
        ];
        let result = strip_marker_syntax_from_messages(&messages);
        assert!(result.changed);
        assert_eq!(result.markers.len(), 1);
        assert_eq!(
            result.messages,
            vec![
                json!({"role":"user","content":"plain"}),
                json!({"role":"assistant","content":"hi  there"})
            ]
        );
    }
}
