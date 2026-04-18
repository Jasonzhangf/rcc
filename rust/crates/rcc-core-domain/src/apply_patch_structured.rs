use serde_json::{Map, Value};

type JsonObject = Map<String, Value>;

pub fn try_parse_json(value: &str) -> Option<Value> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return None;
    }
    if !(trimmed.starts_with('{') || trimmed.starts_with('[')) {
        return None;
    }
    serde_json::from_str(trimmed).ok()
}

pub fn is_structured_apply_patch_payload(candidate: &Value) -> bool {
    candidate
        .as_object()
        .and_then(|record| record.get("changes"))
        .is_some_and(Value::is_array)
}

fn as_string(value: Option<&Value>) -> Option<String> {
    let raw = value?.as_str()?;
    let trimmed = raw.trim();
    (!trimmed.is_empty()).then(|| trimmed.to_string())
}

fn resolve_top_level_file(record: &JsonObject) -> Option<String> {
    let direct = as_string(record.get("file"))
        .or_else(|| as_string(record.get("path")))
        .or_else(|| as_string(record.get("filepath")))
        .or_else(|| as_string(record.get("filename")));
    if direct.is_some() {
        return direct;
    }

    let target = as_string(record.get("target"));
    let has_changes = record
        .get("changes")
        .and_then(Value::as_array)
        .is_some_and(|changes| !changes.is_empty());

    if has_changes {
        target
    } else {
        None
    }
}

fn coerce_changes_array(value: Option<&Value>) -> Option<Vec<Value>> {
    let parsed = match value? {
        Value::String(raw) => try_parse_json(raw),
        other => Some(other.clone()),
    }?;

    let items = if let Some(array) = parsed.as_array() {
        array
            .iter()
            .filter(|entry| entry.is_object())
            .cloned()
            .collect::<Vec<_>>()
    } else if let Some(obj) = parsed.as_object() {
        obj.get("changes")
            .and_then(Value::as_array)
            .map(|array| {
                array
                    .iter()
                    .filter(|entry| entry.is_object())
                    .cloned()
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default()
    } else {
        Vec::new()
    };

    if items.is_empty() {
        return None;
    }

    let has_kind = items.iter().any(|entry| {
        entry
            .as_object()
            .and_then(|obj| obj.get("kind"))
            .and_then(Value::as_str)
            .is_some_and(|kind| !kind.trim().is_empty())
    });

    has_kind.then_some(items)
}

fn build_single_change_payload(record: &JsonObject) -> Option<Value> {
    let kind_raw = as_string(record.get("kind"))?;

    let mut change = JsonObject::new();
    change.insert("kind".to_string(), Value::String(kind_raw.to_lowercase()));

    if let Some(lines) = record
        .get("lines")
        .cloned()
        .or_else(|| record.get("text").cloned())
        .or_else(|| record.get("body").cloned())
    {
        change.insert("lines".to_string(), lines);
    }
    if let Some(target) = as_string(record.get("target")) {
        change.insert("target".to_string(), Value::String(target));
    }
    if let Some(anchor) = as_string(record.get("anchor")) {
        change.insert("anchor".to_string(), Value::String(anchor));
    }
    if let Some(use_anchor_indent) = record.get("use_anchor_indent").and_then(Value::as_bool) {
        change.insert(
            "use_anchor_indent".to_string(),
            Value::Bool(use_anchor_indent),
        );
    }

    let change_file = as_string(record.get("file"))
        .or_else(|| as_string(record.get("path")))
        .or_else(|| as_string(record.get("filepath")))
        .or_else(|| as_string(record.get("filename")));

    if let Some(change_file) = change_file.clone() {
        change.insert("file".to_string(), Value::String(change_file));
    }

    let mut payload = JsonObject::new();
    if let Some(file) = change_file {
        payload.insert("file".to_string(), Value::String(file));
    }
    payload.insert(
        "changes".to_string(),
        Value::Array(vec![Value::Object(change)]),
    );
    Some(Value::Object(payload))
}

pub fn coerce_structured_apply_patch_payload(input: &Value) -> Option<Value> {
    let record = input.as_object()?;
    let top_level_file = resolve_top_level_file(record);

    if record
        .get("changes")
        .and_then(Value::as_array)
        .is_some_and(|changes| changes.is_empty())
    {
        return None;
    }

    if is_structured_apply_patch_payload(input) {
        let mut payload = record.clone();
        let has_file = as_string(payload.get("file")).is_some();
        if !has_file {
            if let Some(file) = top_level_file {
                payload.insert("file".to_string(), Value::String(file));
            }
        }
        return Some(Value::Object(payload));
    }

    let has_changes_array = record.get("changes").is_some_and(Value::is_array);
    if !has_changes_array {
        let changes = coerce_changes_array(record.get("instructions"))
            .or_else(|| coerce_changes_array(record.get("changes")))
            .or_else(|| coerce_changes_array(record.get("edits")))
            .or_else(|| coerce_changes_array(record.get("operations")))
            .or_else(|| coerce_changes_array(record.get("ops")));

        if let Some(changes) = changes {
            let mut payload = JsonObject::new();
            if let Some(file) = top_level_file {
                payload.insert("file".to_string(), Value::String(file));
            }
            payload.insert("changes".to_string(), Value::Array(changes));
            return Some(Value::Object(payload));
        }
    }

    build_single_change_payload(record)
}

#[cfg(test)]
mod tests {
    use super::{
        coerce_structured_apply_patch_payload, is_structured_apply_patch_payload, try_parse_json,
    };
    use serde_json::json;

    #[test]
    fn strict_try_parse_json_requires_json_container() {
        assert_eq!(try_parse_json("hello"), None);
        assert!(try_parse_json("{\"a\":1}").is_some());
    }

    #[test]
    fn structured_payload_guard_requires_changes_array() {
        assert!(is_structured_apply_patch_payload(&json!({"changes": []})));
        assert!(!is_structured_apply_patch_payload(
            &json!({"changes": "[]"})
        ));
    }

    #[test]
    fn structured_payload_injects_top_level_file_when_missing() {
        let input = json!({
            "target": "src/lib.rs",
            "changes": [
                {"kind": "replace", "target": "old", "lines": "new"}
            ]
        });

        let coerced = coerce_structured_apply_patch_payload(&input).unwrap();
        assert_eq!(
            coerced,
            json!({
                "target": "src/lib.rs",
                "file": "src/lib.rs",
                "changes": [
                    {"kind": "replace", "target": "old", "lines": "new"}
                ]
            })
        );
    }

    #[test]
    fn empty_changes_array_returns_none() {
        let input = json!({
            "file": "src/lib.rs",
            "changes": []
        });
        assert_eq!(coerce_structured_apply_patch_payload(&input), None);
    }

    #[test]
    fn instructions_json_string_is_coerced_into_structured_payload() {
        let input = json!({
            "path": "src/main.rs",
            "instructions": "[{\"kind\":\"replace\",\"target\":\"old\",\"lines\":\"new\"}]"
        });

        let coerced = coerce_structured_apply_patch_payload(&input).unwrap();
        assert_eq!(
            coerced,
            json!({
                "file": "src/main.rs",
                "changes": [
                    {"kind":"replace","target":"old","lines":"new"}
                ]
            })
        );
    }

    #[test]
    fn changes_object_string_with_changes_field_is_coerced() {
        let input = json!({
            "filename": "README.md",
            "changes": "{\"changes\":[{\"kind\":\"insert_after\",\"anchor\":\"# Title\",\"lines\":[\"more\"]}]}"
        });

        let coerced = coerce_structured_apply_patch_payload(&input).unwrap();
        assert_eq!(
            coerced,
            json!({
                "file": "README.md",
                "changes": [
                    {"kind":"insert_after","anchor":"# Title","lines":["more"]}
                ]
            })
        );
    }

    #[test]
    fn operations_string_acts_as_fallback_changes_source() {
        let input = json!({
            "file": "src/lib.rs",
            "operations": "[{\"kind\":\"delete\",\"target\":\"obsolete\"}]"
        });

        let coerced = coerce_structured_apply_patch_payload(&input).unwrap();
        assert_eq!(
            coerced,
            json!({
                "file": "src/lib.rs",
                "changes": [
                    {"kind":"delete","target":"obsolete"}
                ]
            })
        );
    }

    #[test]
    fn single_change_shape_is_promoted_to_payload() {
        let input = json!({
            "kind": "REPLACE",
            "text": "new body",
            "target": "old body",
            "anchor": "fn main",
            "filepath": "src/main.rs",
            "use_anchor_indent": true
        });

        let coerced = coerce_structured_apply_patch_payload(&input).unwrap();
        assert_eq!(
            coerced,
            json!({
                "file": "src/main.rs",
                "changes": [
                    {
                        "kind":"replace",
                        "lines":"new body",
                        "target":"old body",
                        "anchor":"fn main",
                        "use_anchor_indent": true,
                        "file":"src/main.rs"
                    }
                ]
            })
        );
    }
}
