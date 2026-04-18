use serde_json::{Map, Number, Value};

#[derive(Debug, Clone, Default, PartialEq)]
pub struct PreCommandState {
    pub pre_command_source: Option<String>,
    pub pre_command_script_path: Option<String>,
    pub pre_command_updated_at: Option<f64>,
}

pub fn serialize_pre_command_state(state: &PreCommandState) -> Map<String, Value> {
    let mut serialized = Map::new();

    if let Some(value) = state
        .pre_command_source
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        serialized.insert(
            "preCommandSource".to_string(),
            Value::String(value.to_string()),
        );
    }

    if let Some(value) = state
        .pre_command_script_path
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        serialized.insert(
            "preCommandScriptPath".to_string(),
            Value::String(value.to_string()),
        );
    }

    if let Some(value) = state
        .pre_command_updated_at
        .filter(|value| value.is_finite())
        .and_then(Number::from_f64)
    {
        serialized.insert("preCommandUpdatedAt".to_string(), Value::Number(value));
    }

    serialized
}

pub fn deserialize_pre_command_state(data: &Map<String, Value>, state: &mut PreCommandState) {
    if let Some(value) = data
        .get("preCommandSource")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        state.pre_command_source = Some(value.to_string());
    }

    if let Some(value) = data
        .get("preCommandScriptPath")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        state.pre_command_script_path = Some(value.to_string());
    }

    if let Some(value) = data
        .get("preCommandUpdatedAt")
        .and_then(Value::as_f64)
        .filter(|value| value.is_finite())
    {
        state.pre_command_updated_at = Some(value);
    }
}

#[cfg(test)]
mod tests {
    use super::{deserialize_pre_command_state, serialize_pre_command_state, PreCommandState};
    use serde_json::{json, Map, Value};

    fn object(value: Value) -> Map<String, Value> {
        value.as_object().cloned().expect("object")
    }

    #[test]
    fn serialize_keeps_only_trimmed_non_empty_and_finite_fields() {
        let state = PreCommandState {
            pre_command_source: Some(" explicit ".to_string()),
            pre_command_script_path: Some(" ./scripts/run.sh ".to_string()),
            pre_command_updated_at: Some(-42.5),
        };

        let serialized = serialize_pre_command_state(&state);
        assert_eq!(
            serialized.get("preCommandSource"),
            Some(&Value::String("explicit".to_string()))
        );
        assert_eq!(
            serialized.get("preCommandScriptPath"),
            Some(&Value::String("./scripts/run.sh".to_string()))
        );
        assert_eq!(
            serialized
                .get("preCommandUpdatedAt")
                .and_then(Value::as_f64),
            Some(-42.5)
        );
    }

    #[test]
    fn serialize_omits_empty_or_non_finite_fields() {
        let state = PreCommandState {
            pre_command_source: Some("   ".to_string()),
            pre_command_script_path: None,
            pre_command_updated_at: Some(f64::NAN),
        };

        let serialized = serialize_pre_command_state(&state);
        assert!(serialized.is_empty());
    }

    #[test]
    fn deserialize_updates_trimmed_valid_fields() {
        let mut state = PreCommandState::default();
        let data = object(json!({
            "preCommandSource": " auto ",
            "preCommandScriptPath": " ./hooks/pre.sh ",
            "preCommandUpdatedAt": 1234.25
        }));

        deserialize_pre_command_state(&data, &mut state);

        assert_eq!(state.pre_command_source.as_deref(), Some("auto"));
        assert_eq!(
            state.pre_command_script_path.as_deref(),
            Some("./hooks/pre.sh")
        );
        assert_eq!(state.pre_command_updated_at, Some(1234.25));
    }

    #[test]
    fn deserialize_preserves_existing_state_when_input_is_invalid() {
        let mut state = PreCommandState {
            pre_command_source: Some("existing-source".to_string()),
            pre_command_script_path: Some("existing-path".to_string()),
            pre_command_updated_at: Some(88.0),
        };
        let data = object(json!({
            "preCommandSource": "   ",
            "preCommandScriptPath": 42,
            "preCommandUpdatedAt": null
        }));

        deserialize_pre_command_state(&data, &mut state);

        assert_eq!(state.pre_command_source.as_deref(), Some("existing-source"));
        assert_eq!(
            state.pre_command_script_path.as_deref(),
            Some("existing-path")
        );
        assert_eq!(state.pre_command_updated_at, Some(88.0));
    }

    #[test]
    fn deserialize_allows_partial_merge_without_clearing_other_fields() {
        let mut state = PreCommandState {
            pre_command_source: Some("existing-source".to_string()),
            pre_command_script_path: Some("existing-path".to_string()),
            pre_command_updated_at: Some(88.0),
        };
        let data = object(json!({
            "preCommandScriptPath": " /next/path.sh "
        }));

        deserialize_pre_command_state(&data, &mut state);

        assert_eq!(state.pre_command_source.as_deref(), Some("existing-source"));
        assert_eq!(
            state.pre_command_script_path.as_deref(),
            Some("/next/path.sh")
        );
        assert_eq!(state.pre_command_updated_at, Some(88.0));
    }
}
