use regex::Regex;
use serde_json::{Map, Number, Value};

fn strip_xml_like_tags(input: &str) -> String {
    static XML_LIKE: std::sync::OnceLock<Regex> = std::sync::OnceLock::new();
    XML_LIKE
        .get_or_init(|| Regex::new(r"<[^>]+>").expect("valid xml-like regex"))
        .replace_all(input, "")
        .into_owned()
}

fn strip_arg_key_artifacts(input: &str) -> String {
    static TOOL_CALL_RE: std::sync::OnceLock<Regex> = std::sync::OnceLock::new();
    static ARG_KEY_RE: std::sync::OnceLock<Regex> = std::sync::OnceLock::new();
    static ARG_VALUE_RE: std::sync::OnceLock<Regex> = std::sync::OnceLock::new();

    let without_tool = TOOL_CALL_RE
        .get_or_init(|| Regex::new(r"</?\s*tool_call[^>]*>").expect("valid tool_call regex"))
        .replace_all(input, "")
        .into_owned();
    let without_key = ARG_KEY_RE
        .get_or_init(|| Regex::new(r"</?\s*arg_key\s*>").expect("valid arg_key regex"))
        .replace_all(&without_tool, "")
        .into_owned();
    ARG_VALUE_RE
        .get_or_init(|| Regex::new(r"</?\s*arg_value\s*>").expect("valid arg_value regex"))
        .replace_all(&without_key, "")
        .into_owned()
}

fn repair_arg_key_artifacts_in_raw_json(input: &str) -> String {
    if !input.contains("<arg_key")
        && !input.contains("<arg_value")
        && !input.contains("</arg_key")
        && !input.contains("</arg_value")
    {
        return input.to_string();
    }

    static RAW_REPAIR: std::sync::OnceLock<Regex> = std::sync::OnceLock::new();
    let repaired = RAW_REPAIR
        .get_or_init(|| {
            Regex::new(r#"\"([^\"]+?)\s*</?\s*arg_key\s*>\s*</?\s*arg_value\s*>([^\"]*?)\""#)
                .expect("valid raw repair regex")
        })
        .replace_all(input, r#""$1":"$2""#)
        .into_owned();
    strip_arg_key_artifacts(&repaired)
}

fn normalize_object_key(raw_key: &str) -> String {
    let cleaned = strip_xml_like_tags(&strip_arg_key_artifacts(raw_key));
    let trimmed = cleaned.trim();
    if trimmed.is_empty() {
        raw_key.to_string()
    } else {
        trimmed.to_string()
    }
}

fn coerce_primitive(raw: &str) -> Value {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Value::String(String::new());
    }
    if trimmed.eq_ignore_ascii_case("true") {
        return Value::Bool(true);
    }
    if trimmed.eq_ignore_ascii_case("false") {
        return Value::Bool(false);
    }
    if let Ok(int_val) = trimmed.parse::<i64>() {
        return Value::Number(Number::from(int_val));
    }
    if let Ok(float_val) = trimmed.parse::<f64>() {
        if let Some(number) = Number::from_f64(float_val) {
            return Value::Number(number);
        }
    }
    if ((trimmed.starts_with('{') && trimmed.ends_with('}'))
        || (trimmed.starts_with('[') && trimmed.ends_with(']')))
        && serde_json::from_str::<Value>(trimmed).is_ok()
    {
        return serde_json::from_str(trimmed)
            .unwrap_or_else(|_| Value::String(trimmed.to_string()));
    }
    Value::String(trimmed.to_string())
}

fn looks_like_key(input: &str) -> bool {
    static KEY_RE: std::sync::OnceLock<Regex> = std::sync::OnceLock::new();
    KEY_RE
        .get_or_init(|| Regex::new(r"^[A-Za-z_][A-Za-z0-9_-]*$").expect("valid key regex"))
        .is_match(input.trim())
}

fn extract_injected_arg_pairs(raw: &str) -> Option<(String, Vec<(String, Value)>)> {
    let delimiter = "</arg_key><arg_value>";
    if !raw.contains(delimiter) {
        return None;
    }

    let parts: Vec<&str> = raw.split(delimiter).collect();
    if parts.len() < 2 {
        return None;
    }

    let mut pairs: Vec<(String, Value)> = Vec::new();
    let mut base_value = parts.first().copied().unwrap_or_default().to_string();

    if parts.len() == 2 {
        let key = parts[0].trim();
        let value = parts[1].trim();
        if looks_like_key(key) && !value.is_empty() {
            base_value.clear();
            pairs.push((key.to_string(), coerce_primitive(value)));
        }
        return if pairs.is_empty() {
            None
        } else {
            Some((base_value, pairs))
        };
    }

    let mut index = 1;
    while index + 1 < parts.len() {
        let key = parts[index].trim();
        let raw_value = parts[index + 1].trim();
        if looks_like_key(key) && !raw_value.is_empty() {
            pairs.push((key.to_string(), coerce_primitive(raw_value)));
        }
        index += 2;
    }

    if pairs.is_empty() {
        None
    } else {
        Some((base_value, pairs))
    }
}

fn repair_arg_key_artifacts_in_keys(value: &mut Value) {
    match value {
        Value::Array(items) => {
            for item in items {
                repair_arg_key_artifacts_in_keys(item);
            }
        }
        Value::Object(obj) => {
            let keys: Vec<String> = obj.keys().cloned().collect();
            for key in keys {
                let normalized_key = normalize_object_key(&key);
                if normalized_key != key && !normalized_key.trim().is_empty() {
                    if !obj.contains_key(&normalized_key) {
                        if let Some(v) = obj.get(&key).cloned() {
                            obj.insert(normalized_key.clone(), v);
                        }
                    }
                    obj.remove(&key);
                }
            }
            for value in obj.values_mut() {
                repair_arg_key_artifacts_in_keys(value);
            }
        }
        _ => {}
    }
}

fn repair_arg_key_artifacts_in_object(value: &mut Value) {
    match value {
        Value::Array(items) => {
            for item in items {
                repair_arg_key_artifacts_in_object(item);
            }
        }
        Value::Object(obj) => {
            let keys: Vec<String> = obj.keys().cloned().collect();
            for key in keys {
                let mut injected_pairs: Option<(String, Vec<(String, Value)>)> = None;
                if let Some(Value::String(raw)) = obj.get(&key) {
                    injected_pairs = extract_injected_arg_pairs(raw);
                }

                if let Some((base_value, pairs)) = injected_pairs {
                    if !base_value.is_empty() {
                        obj.insert(key.clone(), Value::String(base_value));
                    }
                    for (pair_key, pair_value) in pairs {
                        if !obj.contains_key(&pair_key) {
                            obj.insert(pair_key, pair_value);
                        }
                    }
                }

                if let Some(value) = obj.get_mut(&key) {
                    repair_arg_key_artifacts_in_object(value);
                }
            }
        }
        _ => {}
    }
}

fn parse_candidate(candidate: &str) -> Option<Value> {
    let parsed = serde_json::from_str::<Value>(candidate).ok()?;
    let mut parsed = parsed;
    repair_arg_key_artifacts_in_keys(&mut parsed);
    repair_arg_key_artifacts_in_object(&mut parsed);
    Some(parsed)
}

fn extract_first_json_container(raw: &str) -> Option<String> {
    let chars: Vec<(usize, char)> = raw.char_indices().collect();
    let mut start: Option<(usize, char)> = None;
    let mut depth = 0usize;
    let mut in_string = false;
    let mut escaped = false;

    for (idx, ch) in chars {
        if in_string {
            if escaped {
                escaped = false;
                continue;
            }
            match ch {
                '\\' => escaped = true,
                '"' => in_string = false,
                _ => {}
            }
            continue;
        }

        match ch {
            '"' => in_string = true,
            '{' | '[' => {
                if start.is_none() {
                    start = Some((idx, ch));
                }
                depth += 1;
            }
            '}' => {
                if let Some((start_idx, start_ch)) = start {
                    if start_ch == '{' && depth > 0 {
                        depth -= 1;
                        if depth == 0 {
                            return Some(raw[start_idx..=idx].to_string());
                        }
                    }
                }
            }
            ']' => {
                if let Some((start_idx, start_ch)) = start {
                    if start_ch == '[' && depth > 0 {
                        depth -= 1;
                        if depth == 0 {
                            return Some(raw[start_idx..=idx].to_string());
                        }
                    }
                }
            }
            _ => {}
        }
    }
    None
}

pub fn parse_tool_args_json(input: &str) -> Value {
    let raw = input;
    if raw.trim().is_empty() {
        return Value::Object(Map::new());
    }

    if let Some(parsed) = parse_candidate(raw) {
        return parsed;
    }

    let repaired_raw = repair_arg_key_artifacts_in_raw_json(raw);
    if repaired_raw.trim() != raw.trim() {
        if let Some(parsed) = parse_candidate(repaired_raw.trim()) {
            return parsed;
        }
    }

    let stripped = strip_arg_key_artifacts(raw);
    if stripped.trim() != raw.trim() {
        if let Some(parsed) = parse_candidate(stripped.trim()) {
            return parsed;
        }
    }

    if let Some(candidate) = extract_first_json_container(raw) {
        let stripped_candidate = strip_arg_key_artifacts(candidate.trim());
        if let Some(parsed) = parse_candidate(stripped_candidate.trim()) {
            return parsed;
        }
    }

    Value::Object(Map::new())
}

#[cfg(test)]
mod tests {
    use super::parse_tool_args_json;
    use serde_json::json;

    #[test]
    fn empty_input_returns_empty_object() {
        assert_eq!(parse_tool_args_json("   "), json!({}));
    }

    #[test]
    fn valid_json_parses_directly() {
        assert_eq!(
            parse_tool_args_json(r#"{"cmd":"echo hi","count":1}"#),
            json!({"cmd":"echo hi","count":1})
        );
    }

    #[test]
    fn raw_arg_key_artifacts_are_repaired() {
        assert_eq!(
            parse_tool_args_json(r#"{"file</arg_key><arg_value>a.ts"}"#),
            json!({"file":"a.ts"})
        );
    }

    #[test]
    fn xml_like_keys_are_normalized() {
        assert_eq!(
            parse_tool_args_json(r#"{"<arg_key>file</arg_key>":"a.ts"}"#),
            json!({"file":"a.ts"})
        );
    }

    #[test]
    fn injected_arg_pairs_are_promoted_to_object_fields() {
        assert_eq!(
            parse_tool_args_json(
                r#"{"cmd":"echo hi</arg_key><arg_value>timeout</arg_key><arg_value>30"}"#
            ),
            json!({"cmd":"echo hi","timeout":30})
        );
    }

    #[test]
    fn first_json_container_can_be_extracted() {
        assert_eq!(
            parse_tool_args_json("before text {\"cmd\":\"echo hi\"} after text"),
            json!({"cmd":"echo hi"})
        );
    }

    #[test]
    fn invalid_input_returns_empty_object() {
        assert_eq!(parse_tool_args_json("not-json"), json!({}));
    }
}
