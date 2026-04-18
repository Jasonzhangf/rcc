use serde_json::{Map, Number, Value};

const SUMMARY_MAX_CHARS: usize = 4000;

pub fn read_reasoning_stop_state_view(payload: &Value) -> Option<Value> {
    let record = payload.as_object()?;
    let state = record.get("state").and_then(Value::as_object);

    let summary = normalize_summary(
        state
            .and_then(|state| state.get("reasoningStopSummary"))
            .and_then(Value::as_str),
    )
    .unwrap_or_default();
    let armed = state
        .and_then(|state| state.get("reasoningStopArmed"))
        .and_then(Value::as_bool)
        == Some(true)
        && !summary.is_empty();
    let updated_at = state
        .and_then(|state| state.get("reasoningStopUpdatedAt"))
        .and_then(normalize_updated_at);

    let mut out = Map::from_iter([
        ("armed".to_string(), Value::Bool(armed)),
        ("summary".to_string(), Value::String(summary)),
    ]);
    if let Some(updated_at) = updated_at {
        out.insert(
            "updated_at".to_string(),
            Value::Number(Number::from(updated_at)),
        );
    }
    Some(Value::Object(out))
}

pub fn build_clear_reasoning_stop_state_result(payload: &Value) -> Option<Value> {
    let record = payload.as_object()?;
    let Some(state) = record.get("state").and_then(Value::as_object) else {
        return Some(Value::Null);
    };

    let mut next = state.clone();
    next.remove("reasoningStopArmed");
    next.remove("reasoningStopSummary");
    next.remove("reasoningStopUpdatedAt");
    next.remove("reasoningStopFailCount");

    if next.is_empty() {
        Some(Value::Null)
    } else {
        Some(Value::Object(next))
    }
}

fn normalize_summary(value: Option<&str>) -> Option<String> {
    let summary = value?.trim();
    if summary.is_empty() {
        return None;
    }
    Some(summary.chars().take(SUMMARY_MAX_CHARS).collect())
}

fn normalize_updated_at(value: &Value) -> Option<i64> {
    value
        .as_f64()
        .filter(|number| number.is_finite())
        .map(|number| number.floor().max(0.0) as i64)
}
