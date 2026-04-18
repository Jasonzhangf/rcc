use serde_json::{Map, Number, Value};

pub const DEFAULT_STOP_MESSAGE_MAX_REPEATS: i64 = 10;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StopMessageStageMode {
    On,
    Off,
    Auto,
}

impl StopMessageStageMode {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::On => "on",
            Self::Off => "off",
            Self::Auto => "auto",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StopMessageAiMode {
    On,
    Off,
}

impl StopMessageAiMode {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::On => "on",
            Self::Off => "off",
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct StopMessageSnapshot {
    pub text: String,
    pub max_repeats: i64,
    pub used: i64,
    pub source: Option<String>,
    pub updated_at: Option<f64>,
    pub last_used_at: Option<f64>,
    pub stage_mode: Option<StopMessageStageMode>,
    pub ai_mode: StopMessageAiMode,
}

pub fn normalize_stop_message_stage_mode(value: &str) -> Option<StopMessageStageMode> {
    match value.trim().to_ascii_lowercase().as_str() {
        "on" => Some(StopMessageStageMode::On),
        "off" => Some(StopMessageStageMode::Off),
        "auto" => Some(StopMessageStageMode::Auto),
        _ => None,
    }
}

pub fn normalize_stop_message_ai_mode(value: &str) -> Option<StopMessageAiMode> {
    match value.trim().to_ascii_lowercase().as_str() {
        "on" => Some(StopMessageAiMode::On),
        "off" => Some(StopMessageAiMode::Off),
        _ => None,
    }
}

pub fn resolve_stop_message_max_repeats(
    value: &Value,
    stage_mode: Option<StopMessageStageMode>,
) -> i64 {
    let parsed = value
        .as_f64()
        .filter(|number| number.is_finite())
        .map_or(0, |number| number.floor() as i64);
    if parsed > 0 {
        return parsed;
    }
    match stage_mode {
        Some(StopMessageStageMode::On | StopMessageStageMode::Auto) => {
            DEFAULT_STOP_MESSAGE_MAX_REPEATS
        }
        _ => 0,
    }
}

pub fn normalize_stop_message_ai_history_entries(value: &Value) -> Vec<Map<String, Value>> {
    let Some(entries) = value.as_array() else {
        return Vec::new();
    };

    let mut out = Vec::new();
    for item in entries {
        let Some(record) = item.as_object() else {
            continue;
        };
        let mut normalized = Map::new();

        if let Some(ts) = finite_floored_integer_value(record.get("ts")) {
            normalized.insert("ts".to_string(), ts);
        }
        if let Some(round) = record
            .get("round")
            .and_then(Value::as_f64)
            .filter(|number| number.is_finite())
            .map(|number| number.floor().max(0.0) as i64)
            .map(|number| Value::Number(Number::from(number)))
        {
            normalized.insert("round".to_string(), round);
        }

        for key in [
            "assistantText",
            "reasoningText",
            "responseExcerpt",
            "followupText",
        ] {
            if let Some(text) = record.get(key).and_then(Value::as_str).map(str::trim) {
                if !text.is_empty() {
                    normalized.insert(key.to_string(), Value::String(text.to_string()));
                }
            }
        }

        if !normalized.is_empty() {
            out.push(normalized);
        }
    }

    let keep_from = out.len().saturating_sub(8);
    out.into_iter().skip(keep_from).collect()
}

pub fn resolve_stop_message_snapshot(raw: &Value) -> Option<StopMessageSnapshot> {
    let record = raw.as_object()?;
    let text = record
        .get("stopMessageText")
        .and_then(Value::as_str)
        .map(str::trim)
        .unwrap_or("")
        .to_string();
    let stage_mode = record
        .get("stopMessageStageMode")
        .and_then(Value::as_str)
        .and_then(normalize_stop_message_stage_mode);
    if stage_mode == Some(StopMessageStageMode::Off) {
        return None;
    }

    let ai_mode = record
        .get("stopMessageAiMode")
        .and_then(Value::as_str)
        .and_then(normalize_stop_message_ai_mode)
        .unwrap_or(StopMessageAiMode::On);
    let max_repeats = resolve_stop_message_max_repeats(
        record.get("stopMessageMaxRepeats").unwrap_or(&Value::Null),
        stage_mode,
    );
    if text.is_empty() || max_repeats <= 0 {
        return None;
    }

    let used = record
        .get("stopMessageUsed")
        .and_then(Value::as_f64)
        .filter(|number| number.is_finite())
        .map(|number| number.floor().max(0.0) as i64)
        .unwrap_or(0);
    let updated_at = record
        .get("stopMessageUpdatedAt")
        .and_then(Value::as_f64)
        .filter(|number| number.is_finite());
    let last_used_at = record
        .get("stopMessageLastUsedAt")
        .and_then(Value::as_f64)
        .filter(|number| number.is_finite());
    let source = record
        .get("stopMessageSource")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string);

    Some(StopMessageSnapshot {
        text,
        max_repeats,
        used,
        source,
        updated_at,
        last_used_at,
        stage_mode,
        ai_mode,
    })
}

pub fn has_armed_stop_message_state(raw: &Value) -> bool {
    let Some(record) = raw.as_object() else {
        return false;
    };
    let text = record
        .get("stopMessageText")
        .and_then(Value::as_str)
        .map(str::trim)
        .unwrap_or("");
    let stage_mode = record
        .get("stopMessageStageMode")
        .and_then(Value::as_str)
        .and_then(normalize_stop_message_stage_mode);
    if stage_mode == Some(StopMessageStageMode::Off) {
        return false;
    }
    let max_repeats = resolve_stop_message_max_repeats(
        record.get("stopMessageMaxRepeats").unwrap_or(&Value::Null),
        stage_mode,
    );
    !text.is_empty() && max_repeats > 0
}

fn finite_floored_integer_value(value: Option<&Value>) -> Option<Value> {
    value
        .and_then(Value::as_f64)
        .filter(|number| number.is_finite())
        .map(|number| Value::Number(Number::from(number.floor() as i64)))
}

#[cfg(test)]
mod tests {
    use super::{
        has_armed_stop_message_state, normalize_stop_message_ai_history_entries,
        normalize_stop_message_ai_mode, normalize_stop_message_stage_mode,
        resolve_stop_message_max_repeats, resolve_stop_message_snapshot, StopMessageAiMode,
        StopMessageStageMode, DEFAULT_STOP_MESSAGE_MAX_REPEATS,
    };
    use serde_json::json;

    #[test]
    fn normalizes_stage_and_ai_modes() {
        assert_eq!(
            normalize_stop_message_stage_mode(" Auto "),
            Some(StopMessageStageMode::Auto)
        );
        assert_eq!(
            normalize_stop_message_ai_mode(" OFF "),
            Some(StopMessageAiMode::Off)
        );
        assert_eq!(normalize_stop_message_stage_mode("later"), None);
        assert_eq!(normalize_stop_message_ai_mode("later"), None);
    }

    #[test]
    fn resolves_max_repeats_with_default_fallback() {
        assert_eq!(
            resolve_stop_message_max_repeats(&json!(2.9), Some(StopMessageStageMode::On)),
            2
        );
        assert_eq!(
            resolve_stop_message_max_repeats(&json!(0), Some(StopMessageStageMode::Auto)),
            DEFAULT_STOP_MESSAGE_MAX_REPEATS
        );
        assert_eq!(resolve_stop_message_max_repeats(&json!(null), None), 0);
    }

    #[test]
    fn normalizes_ai_history_entries_and_keeps_last_eight() {
        let mut items = Vec::new();
        for idx in 0..10 {
            items.push(json!({
                "ts": (idx as f64) + 0.9,
                "round": idx - 2,
                "assistantText": format!("  a{idx}  "),
                "ignored": "x"
            }));
        }
        let result = normalize_stop_message_ai_history_entries(&json!(items));
        assert_eq!(result.len(), 8);
        assert_eq!(result[0]["ts"], json!(2));
        assert_eq!(result[0]["round"], json!(0));
        assert_eq!(result[0]["assistantText"], json!("a2"));
        assert!(result[0].get("ignored").is_none());
        assert_eq!(result[7]["assistantText"], json!("a9"));
    }

    #[test]
    fn resolves_snapshot_with_defaults() {
        let snapshot = resolve_stop_message_snapshot(&json!({
            "stopMessageText": "  hello  ",
            "stopMessageStageMode": "auto",
            "stopMessageMaxRepeats": 0,
            "stopMessageUsed": 1.9,
            "stopMessageSource": "  explicit  "
        }))
        .expect("snapshot");

        assert_eq!(snapshot.text, "hello");
        assert_eq!(snapshot.max_repeats, DEFAULT_STOP_MESSAGE_MAX_REPEATS);
        assert_eq!(snapshot.used, 1);
        assert_eq!(snapshot.source.as_deref(), Some("explicit"));
        assert_eq!(snapshot.stage_mode, Some(StopMessageStageMode::Auto));
        assert_eq!(snapshot.ai_mode, StopMessageAiMode::On);
    }

    #[test]
    fn snapshot_returns_none_for_off_or_empty_state() {
        assert!(resolve_stop_message_snapshot(&json!({
            "stopMessageText": "hello",
            "stopMessageStageMode": "off",
            "stopMessageMaxRepeats": 3
        }))
        .is_none());

        assert!(resolve_stop_message_snapshot(&json!({
            "stopMessageText": "   ",
            "stopMessageStageMode": "on",
            "stopMessageMaxRepeats": 3
        }))
        .is_none());
    }

    #[test]
    fn armed_state_follows_text_stage_mode_and_resolved_repeats() {
        assert!(has_armed_stop_message_state(&json!({
            "stopMessageText": "hello",
            "stopMessageStageMode": "on",
            "stopMessageMaxRepeats": 0
        })));
        assert!(!has_armed_stop_message_state(&json!({
            "stopMessageText": "hello",
            "stopMessageStageMode": "off",
            "stopMessageMaxRepeats": 5
        })));
        assert!(!has_armed_stop_message_state(&json!({
            "stopMessageText": "   ",
            "stopMessageStageMode": "auto",
            "stopMessageMaxRepeats": 5
        })));
    }
}
