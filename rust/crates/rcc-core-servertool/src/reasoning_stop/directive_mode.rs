use rcc_core_domain::{
    extract_message_text, get_latest_user_message_index, merge_reasoning_stop_serialization,
    normalize_reasoning_stop_mode, ReasoningStopMode, RoutingStopMessageState,
};
use serde_json::{Map, Value};

const STORED_MODE_KEYS: [&str; 2] = ["reasoningStopDirectiveMode", "__reasoningStopDirectiveMode"];
const DIRECTIVE_PREFIX: &str = "<**stopless:";
const DIRECTIVE_SUFFIX: &str = "**>";

pub fn build_reasoning_stop_mode_sync_result(payload: &Value) -> Option<Value> {
    let record = payload.as_object()?;
    let mut captured = record.get("captured")?.as_object()?.clone();
    let base_state = record
        .get("base_state")
        .and_then(Value::as_object)
        .cloned()
        .unwrap_or_default();
    let fallback_mode = record
        .get("fallback_mode")
        .and_then(Value::as_str)
        .and_then(normalize_reasoning_stop_mode)
        .unwrap_or(ReasoningStopMode::Off);

    let stored_mode =
        read_stored_directive_mode(&captured).or_else(|| read_stored_directive_mode(record));
    let inline_mode = if stored_mode.is_none() {
        let mode = extract_inline_directive_mode(&captured);
        strip_stopless_directive_markers_from_captured(&mut captured);
        mode
    } else {
        None
    };

    let directive_mode = stored_mode.or(inline_mode);
    let resolved_mode = directive_mode
        .or_else(|| read_base_state_mode(&base_state))
        .unwrap_or(fallback_mode);

    let mut out = Map::from_iter([
        (
            "mode".to_string(),
            Value::String(resolved_mode.as_str().to_string()),
        ),
        ("captured".to_string(), Value::Object(captured)),
    ]);

    if let Some(directive_mode) = directive_mode {
        out.insert(
            "state_patch".to_string(),
            Value::Object(build_state_patch(&base_state, directive_mode)),
        );
    }

    Some(Value::Object(out))
}

fn read_stored_directive_mode(record: &Map<String, Value>) -> Option<ReasoningStopMode> {
    STORED_MODE_KEYS.iter().find_map(|key| {
        record
            .get(*key)
            .and_then(Value::as_str)
            .and_then(normalize_reasoning_stop_mode)
    })
}

fn extract_inline_directive_mode(captured: &Map<String, Value>) -> Option<ReasoningStopMode> {
    let messages = captured.get("messages").and_then(Value::as_array)?;
    let idx = get_latest_user_message_index(messages)?;
    let text = extract_message_text(&messages[idx]);
    extract_stopless_directive_mode_from_text(&text)
}

fn extract_stopless_directive_mode_from_text(text: &str) -> Option<ReasoningStopMode> {
    let lowered = text.to_ascii_lowercase();
    let mut cursor = 0;
    let mut matched = None;

    while let Some(start_rel) = lowered[cursor..].find(DIRECTIVE_PREFIX) {
        let start = cursor + start_rel;
        let body_start = start + DIRECTIVE_PREFIX.len();
        let Some(end_rel) = lowered[body_start..].find(DIRECTIVE_SUFFIX) else {
            break;
        };
        let body_end = body_start + end_rel;
        if let Some(mode) = normalize_reasoning_stop_mode(lowered[body_start..body_end].trim()) {
            matched = Some(mode);
        }
        cursor = body_end + DIRECTIVE_SUFFIX.len();
    }

    matched
}

fn strip_stopless_directive_markers_from_captured(captured: &mut Map<String, Value>) -> bool {
    let mut stripped = false;
    if let Some(messages) = captured.get_mut("messages").and_then(Value::as_array_mut) {
        stripped |= strip_stopless_directive_markers_in_messages(messages);
    }
    if let Some(input) = captured.get_mut("input").and_then(Value::as_array_mut) {
        stripped |= strip_stopless_directive_markers_in_messages(input);
    }
    stripped
}

fn strip_stopless_directive_markers_in_messages(messages: &mut [Value]) -> bool {
    let mut stripped = false;
    for message in messages {
        let Some(record) = message.as_object_mut() else {
            continue;
        };
        let role = record
            .get("role")
            .and_then(Value::as_str)
            .map(|value| value.trim().to_ascii_lowercase())
            .unwrap_or_default();
        if role != "user" {
            continue;
        }
        let Some(content) = record.get_mut("content") else {
            continue;
        };
        stripped |= strip_stopless_directive_markers_from_content(content);
    }
    stripped
}

fn strip_stopless_directive_markers_from_content(content: &mut Value) -> bool {
    match content {
        Value::String(text) => {
            let (next, stripped) = strip_stopless_directive_markers_from_text(text);
            if stripped {
                *text = next;
            }
            stripped
        }
        Value::Array(items) => {
            let mut stripped = false;
            for item in items {
                match item {
                    Value::String(text) => {
                        let (next, changed) = strip_stopless_directive_markers_from_text(text);
                        if changed {
                            *text = next;
                            stripped = true;
                        }
                    }
                    Value::Object(record) => {
                        let Some(Value::String(text)) = record.get_mut("text") else {
                            continue;
                        };
                        let (next, changed) = strip_stopless_directive_markers_from_text(text);
                        if changed {
                            *text = next;
                            stripped = true;
                        }
                    }
                    _ => {}
                }
            }
            stripped
        }
        _ => false,
    }
}

fn strip_stopless_directive_markers_from_text(text: &str) -> (String, bool) {
    let lowered = text.to_ascii_lowercase();
    let mut cursor = 0;
    let mut stripped = false;
    let mut out = String::new();

    while let Some(start_rel) = lowered[cursor..].find(DIRECTIVE_PREFIX) {
        let start = cursor + start_rel;
        let body_start = start + DIRECTIVE_PREFIX.len();
        let Some(end_rel) = lowered[body_start..].find(DIRECTIVE_SUFFIX) else {
            break;
        };
        let end = body_start + end_rel + DIRECTIVE_SUFFIX.len();
        out.push_str(&text[cursor..start]);
        out.push(' ');
        cursor = end;
        stripped = true;
    }

    if !stripped {
        return (text.to_string(), false);
    }

    out.push_str(&text[cursor..]);
    (compact_stripped_text(&out), true)
}

fn compact_stripped_text(text: &str) -> String {
    let mut lines = Vec::new();
    let mut blank_seen = false;

    for raw_line in text.lines() {
        let collapsed = collapse_horizontal_whitespace(raw_line.trim_matches([' ', '\t']));
        if collapsed.is_empty() {
            if !blank_seen {
                lines.push(String::new());
                blank_seen = true;
            }
            continue;
        }
        blank_seen = false;
        lines.push(collapsed);
    }

    lines.join("\n").trim().to_string()
}

fn collapse_horizontal_whitespace(text: &str) -> String {
    let mut out = String::new();
    let mut in_gap = false;
    for ch in text.chars() {
        if ch == ' ' || ch == '\t' {
            if !in_gap {
                out.push(' ');
                in_gap = true;
            }
            continue;
        }
        in_gap = false;
        out.push(ch);
    }
    out
}

fn read_base_state_mode(base_state: &Map<String, Value>) -> Option<ReasoningStopMode> {
    base_state
        .get("reasoningStopMode")
        .and_then(Value::as_str)
        .and_then(normalize_reasoning_stop_mode)
}

fn build_state_patch(
    base_state: &Map<String, Value>,
    directive_mode: ReasoningStopMode,
) -> Map<String, Value> {
    let mut patch = merge_reasoning_stop_serialization(
        base_state,
        &RoutingStopMessageState {
            reasoning_stop_mode: Some(directive_mode),
            ..Default::default()
        },
    );

    if directive_mode == ReasoningStopMode::Off {
        patch.remove("reasoningStopArmed");
        patch.remove("reasoningStopSummary");
        patch.remove("reasoningStopUpdatedAt");
    }

    patch
}
