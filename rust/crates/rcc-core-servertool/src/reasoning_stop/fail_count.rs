use super::sticky_store::{load_sticky_state_object, save_sticky_state_object};
use serde_json::{json, Number, Value};

pub fn read_reasoning_stop_fail_count(payload: &Value) -> Option<Value> {
    let record = payload.as_object()?;
    let sticky_key = record.get("sticky_key")?.as_str()?.trim();
    let session_dir = record.get("session_dir").and_then(Value::as_str);
    let state = load_sticky_state_object(sticky_key, session_dir)?;
    let count = state
        .as_ref()
        .and_then(|state| state.get("reasoningStopFailCount"))
        .and_then(normalize_count)
        .unwrap_or(0);
    Some(json!({ "count": count }))
}

pub fn increment_reasoning_stop_fail_count(payload: &Value) -> Option<Value> {
    let record = payload.as_object()?;
    let sticky_key = record.get("sticky_key")?.as_str()?.trim();
    let session_dir = record.get("session_dir").and_then(Value::as_str);
    let mut state = load_sticky_state_object(sticky_key, session_dir)?.unwrap_or_default();
    let current = state
        .get("reasoningStopFailCount")
        .and_then(normalize_count)
        .unwrap_or(0);
    let next = current + 1;
    state.insert(
        "reasoningStopFailCount".to_string(),
        Value::Number(Number::from(next)),
    );
    save_sticky_state_object(sticky_key, session_dir, Some(&state))?;
    Some(json!({ "count": next }))
}

pub fn reset_reasoning_stop_fail_count(payload: &Value) -> Option<Value> {
    let record = payload.as_object()?;
    let sticky_key = record.get("sticky_key")?.as_str()?.trim();
    let session_dir = record.get("session_dir").and_then(Value::as_str);
    let next = match load_sticky_state_object(sticky_key, session_dir)? {
        Some(mut state) => {
            state.remove("reasoningStopFailCount");
            if state.is_empty() {
                None
            } else {
                Some(state)
            }
        }
        None => None,
    };
    save_sticky_state_object(sticky_key, session_dir, next.as_ref())?;
    Some(json!({ "count": 0 }))
}

fn normalize_count(value: &Value) -> Option<i64> {
    value
        .as_f64()
        .filter(|value| value.is_finite())
        .map(|value| value.floor().max(0.0) as i64)
}
