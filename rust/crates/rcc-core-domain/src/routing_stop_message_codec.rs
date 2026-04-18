use serde_json::{Map, Number, Value};

use crate::stop_message_state::{
    normalize_stop_message_ai_history_entries, normalize_stop_message_ai_mode,
    normalize_stop_message_stage_mode, StopMessageAiMode, StopMessageStageMode,
    DEFAULT_STOP_MESSAGE_MAX_REPEATS,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ReasoningStopMode {
    On,
    Off,
    Endless,
}

impl ReasoningStopMode {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::On => "on",
            Self::Off => "off",
            Self::Endless => "endless",
        }
    }
}

#[derive(Debug, Clone, Default, PartialEq)]
pub struct RoutingStopMessageState {
    pub stop_message_source: Option<String>,
    pub stop_message_text: Option<String>,
    pub stop_message_max_repeats: Option<f64>,
    pub stop_message_used: Option<f64>,
    pub stop_message_updated_at: Option<f64>,
    pub stop_message_last_used_at: Option<f64>,
    pub stop_message_stage_mode: Option<StopMessageStageMode>,
    pub stop_message_ai_mode: Option<StopMessageAiMode>,
    pub stop_message_ai_seed_prompt: Option<String>,
    pub stop_message_ai_history: Option<Vec<Map<String, Value>>>,
    pub reasoning_stop_mode: Option<ReasoningStopMode>,
    pub reasoning_stop_armed: Option<bool>,
    pub reasoning_stop_summary: Option<String>,
    pub reasoning_stop_updated_at: Option<f64>,
}

pub fn normalize_reasoning_stop_mode(value: &str) -> Option<ReasoningStopMode> {
    match value.trim().to_ascii_lowercase().as_str() {
        "on" => Some(ReasoningStopMode::On),
        "off" => Some(ReasoningStopMode::Off),
        "endless" => Some(ReasoningStopMode::Endless),
        _ => None,
    }
}

pub fn merge_reasoning_stop_serialization(
    base: &Map<String, Value>,
    state: &RoutingStopMessageState,
) -> Map<String, Value> {
    let mut out = base.clone();

    if let Some(mode) = state.reasoning_stop_mode {
        out.insert(
            "reasoningStopMode".to_string(),
            Value::String(mode.as_str().to_string()),
        );
    }
    if let Some(armed) = state.reasoning_stop_armed {
        out.insert("reasoningStopArmed".to_string(), Value::Bool(armed));
    }
    if let Some(summary) = state
        .reasoning_stop_summary
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        out.insert(
            "reasoningStopSummary".to_string(),
            Value::String(summary.to_string()),
        );
    }
    if let Some(value) = state
        .reasoning_stop_updated_at
        .filter(|value| value.is_finite())
        .map(|value| value.round().max(0.0) as i64)
    {
        out.insert(
            "reasoningStopUpdatedAt".to_string(),
            Value::Number(Number::from(value)),
        );
    }

    out
}

pub fn apply_stop_message_state_fallback_patch(
    data: &Map<String, Value>,
    state: &mut RoutingStopMessageState,
) {
    if let Some(value) = data
        .get("stopMessageSource")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        state.stop_message_source = Some(value.to_string());
    }

    if let Some(value) = data.get("stopMessageText").and_then(Value::as_str) {
        if !value.trim().is_empty() {
            state.stop_message_text = Some(value.to_string());
        }
    }

    let has_persisted_max_repeats = data
        .get("stopMessageMaxRepeats")
        .and_then(Value::as_f64)
        .filter(|value| value.is_finite())
        .map(|value| {
            state.stop_message_max_repeats = Some(value.floor());
            true
        })
        .unwrap_or(false);

    if let Some(value) = data
        .get("stopMessageUsed")
        .and_then(Value::as_f64)
        .filter(|value| value.is_finite())
    {
        state.stop_message_used = Some(value.floor().max(0.0));
    }
    if let Some(value) = data
        .get("stopMessageUpdatedAt")
        .and_then(Value::as_f64)
        .filter(|value| value.is_finite())
    {
        state.stop_message_updated_at = Some(value);
    }
    if let Some(value) = data
        .get("stopMessageLastUsedAt")
        .and_then(Value::as_f64)
        .filter(|value| value.is_finite())
    {
        state.stop_message_last_used_at = Some(value);
    }
    if let Some(value) = data
        .get("stopMessageStageMode")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .and_then(normalize_stop_message_stage_mode)
    {
        state.stop_message_stage_mode = Some(value);
    }
    if let Some(value) = data
        .get("stopMessageAiMode")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .and_then(normalize_stop_message_ai_mode)
    {
        state.stop_message_ai_mode = Some(value);
    }
    if let Some(value) = data
        .get("stopMessageAiSeedPrompt")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        state.stop_message_ai_seed_prompt = Some(value.to_string());
    }

    let history = normalize_stop_message_ai_history_entries(
        data.get("stopMessageAiHistory").unwrap_or(&Value::Null),
    );
    if !history.is_empty() {
        state.stop_message_ai_history = Some(history);
    }

    if let Some(value) = data
        .get("reasoningStopMode")
        .and_then(Value::as_str)
        .and_then(normalize_reasoning_stop_mode)
    {
        state.reasoning_stop_mode = Some(value);
    }
    if let Some(value) = data.get("reasoningStopArmed").and_then(Value::as_bool) {
        state.reasoning_stop_armed = Some(value);
    }
    if let Some(value) = data
        .get("reasoningStopSummary")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        state.reasoning_stop_summary = Some(value.to_string());
    }
    if let Some(value) = data
        .get("reasoningStopUpdatedAt")
        .and_then(Value::as_f64)
        .filter(|value| value.is_finite())
    {
        state.reasoning_stop_updated_at = Some(value.round().max(0.0));
    }

    if !has_persisted_max_repeats {
        ensure_stop_message_mode_max_repeats(state);
    }
}

pub fn ensure_stop_message_mode_max_repeats(state: &mut RoutingStopMessageState) -> bool {
    let mode = state.stop_message_stage_mode;
    if mode != Some(StopMessageStageMode::On) && mode != Some(StopMessageStageMode::Auto) {
        return false;
    }

    if let Some(value) = state
        .stop_message_max_repeats
        .filter(|value| value.is_finite() && value.floor() > 0.0)
    {
        let normalized = value.floor();
        if (value - normalized).abs() > f64::EPSILON {
            state.stop_message_max_repeats = Some(normalized);
            return true;
        }
        return false;
    }

    state.stop_message_max_repeats = Some(DEFAULT_STOP_MESSAGE_MAX_REPEATS as f64);
    true
}

#[cfg(test)]
mod tests {
    use super::{
        apply_stop_message_state_fallback_patch, ensure_stop_message_mode_max_repeats,
        merge_reasoning_stop_serialization, normalize_reasoning_stop_mode, ReasoningStopMode,
        RoutingStopMessageState,
    };
    use crate::stop_message_state::{StopMessageAiMode, StopMessageStageMode};
    use serde_json::{json, Map, Value};

    fn object(value: Value) -> Map<String, Value> {
        value.as_object().cloned().expect("object")
    }

    #[test]
    fn normalizes_reasoning_mode_values() {
        assert_eq!(
            normalize_reasoning_stop_mode(" On "),
            Some(ReasoningStopMode::On)
        );
        assert_eq!(
            normalize_reasoning_stop_mode("ENDLESS"),
            Some(ReasoningStopMode::Endless)
        );
        assert_eq!(normalize_reasoning_stop_mode("later"), None);
    }

    #[test]
    fn serialize_merge_only_adds_valid_reasoning_fields() {
        let base = object(json!({"native": true}));
        let state = RoutingStopMessageState {
            reasoning_stop_mode: Some(ReasoningStopMode::Off),
            reasoning_stop_armed: Some(true),
            reasoning_stop_summary: Some("  summary  ".to_string()),
            reasoning_stop_updated_at: Some(-1.4),
            ..Default::default()
        };

        let merged = merge_reasoning_stop_serialization(&base, &state);
        assert_eq!(merged.get("native"), Some(&Value::Bool(true)));
        assert_eq!(
            merged.get("reasoningStopMode"),
            Some(&Value::String("off".to_string()))
        );
        assert_eq!(merged.get("reasoningStopArmed"), Some(&Value::Bool(true)));
        assert_eq!(
            merged.get("reasoningStopSummary"),
            Some(&Value::String("summary".to_string()))
        );
        assert_eq!(merged.get("reasoningStopUpdatedAt"), Some(&json!(0)));
    }

    #[test]
    fn fallback_patch_applies_stop_and_reasoning_fields() {
        let patch = object(json!({
            "stopMessageSource": "  explicit  ",
            "stopMessageText": "  keep raw  ",
            "stopMessageMaxRepeats": 3.8,
            "stopMessageUsed": -2.4,
            "stopMessageUpdatedAt": 11.5,
            "stopMessageLastUsedAt": 13.5,
            "stopMessageStageMode": " auto ",
            "stopMessageAiMode": " off ",
            "stopMessageAiSeedPrompt": "  seed  ",
            "stopMessageAiHistory": [
              {"ts": 5.9, "assistantText": "  hi  "},
              {"noop": true}
            ],
            "reasoningStopMode": " endless ",
            "reasoningStopArmed": true,
            "reasoningStopSummary": "  why  ",
            "reasoningStopUpdatedAt": 2.6
        }));
        let mut state = RoutingStopMessageState::default();

        apply_stop_message_state_fallback_patch(&patch, &mut state);

        assert_eq!(state.stop_message_source.as_deref(), Some("explicit"));
        assert_eq!(state.stop_message_text.as_deref(), Some("  keep raw  "));
        assert_eq!(state.stop_message_max_repeats, Some(3.0));
        assert_eq!(state.stop_message_used, Some(0.0));
        assert_eq!(state.stop_message_updated_at, Some(11.5));
        assert_eq!(state.stop_message_last_used_at, Some(13.5));
        assert_eq!(
            state.stop_message_stage_mode,
            Some(StopMessageStageMode::Auto)
        );
        assert_eq!(state.stop_message_ai_mode, Some(StopMessageAiMode::Off));
        assert_eq!(state.stop_message_ai_seed_prompt.as_deref(), Some("seed"));
        assert_eq!(
            state.stop_message_ai_history.as_ref().map(Vec::len),
            Some(1)
        );
        assert_eq!(state.reasoning_stop_mode, Some(ReasoningStopMode::Endless));
        assert_eq!(state.reasoning_stop_armed, Some(true));
        assert_eq!(state.reasoning_stop_summary.as_deref(), Some("why"));
        assert_eq!(state.reasoning_stop_updated_at, Some(3.0));
    }

    #[test]
    fn fallback_patch_ensures_default_max_repeats_when_missing() {
        let patch = object(json!({
            "stopMessageStageMode": "on"
        }));
        let mut state = RoutingStopMessageState::default();

        apply_stop_message_state_fallback_patch(&patch, &mut state);

        assert_eq!(
            state.stop_message_stage_mode,
            Some(StopMessageStageMode::On)
        );
        assert_eq!(state.stop_message_max_repeats, Some(10.0));
    }

    #[test]
    fn ensure_max_repeats_floors_existing_value_or_skips_off_mode() {
        let mut state = RoutingStopMessageState {
            stop_message_stage_mode: Some(StopMessageStageMode::Auto),
            stop_message_max_repeats: Some(4.9),
            ..Default::default()
        };
        assert!(ensure_stop_message_mode_max_repeats(&mut state));
        assert_eq!(state.stop_message_max_repeats, Some(4.0));

        let mut off_state = RoutingStopMessageState {
            stop_message_stage_mode: Some(StopMessageStageMode::Off),
            stop_message_max_repeats: None,
            ..Default::default()
        };
        assert!(!ensure_stop_message_mode_max_repeats(&mut off_state));
        assert_eq!(off_state.stop_message_max_repeats, None);
    }
}
