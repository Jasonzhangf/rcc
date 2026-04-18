use serde_json::{Map, Value};

pub(crate) fn build_apikey_headers_map(
    auth: Option<&Map<String, Value>>,
) -> Option<Map<String, Value>> {
    let Some(auth) = auth else {
        return Some(Map::new());
    };

    let auth_type = read_trimmed_string(auth, &["type"]).unwrap_or_else(|| "apikey".to_string());
    if auth_type != "apikey" {
        return None;
    }

    let api_key = read_trimmed_string(auth, &["api_key", "apiKey"]).unwrap_or_default();
    if api_key.is_empty() {
        return Some(Map::new());
    }

    let header_name = read_trimmed_string(auth, &["header_name", "headerName"])
        .unwrap_or_else(|| "Authorization".to_string());
    let mut headers = Map::new();

    if header_name.eq_ignore_ascii_case("authorization") {
        let prefix = read_trimmed_string(auth, &["prefix"]).unwrap_or_else(|| "Bearer".to_string());
        headers.insert(header_name, Value::String(format!("{prefix} {api_key}")));
    } else {
        headers.insert(header_name, Value::String(api_key));
    }

    Some(headers)
}

pub fn build_apikey_headers(payload: &Value) -> Option<Value> {
    let record = payload.as_object()?;
    let auth = record.get("auth").and_then(Value::as_object).or_else(|| {
        record
            .get("provider")
            .and_then(Value::as_object)
            .and_then(|provider| provider.get("auth"))
            .and_then(Value::as_object)
    });

    Some(Value::Object(build_apikey_headers_map(auth)?))
}

fn read_trimmed_string(record: &Map<String, Value>, keys: &[&str]) -> Option<String> {
    keys.iter()
        .filter_map(|key| record.get(*key).and_then(Value::as_str))
        .map(str::trim)
        .find(|value| !value.is_empty())
        .map(ToOwned::to_owned)
}

#[cfg(test)]
mod tests {
    use super::build_apikey_headers;
    use serde_json::json;

    #[test]
    fn build_apikey_headers_uses_default_authorization_header() {
        let result = build_apikey_headers(&json!({
            "auth": {
                "type": "apikey",
                "api_key": "sk-example"
            }
        }))
        .expect("headers");

        assert_eq!(
            result,
            json!({
                "Authorization": "Bearer sk-example"
            })
        );
    }

    #[test]
    fn build_apikey_headers_uses_custom_header_without_prefix() {
        let result = build_apikey_headers(&json!({
            "auth": {
                "type": "apikey",
                "api_key": "token-1",
                "header_name": "x-api-key",
                "prefix": "Ignored"
            }
        }))
        .expect("headers");

        assert_eq!(result, json!({"x-api-key": "token-1"}));
    }

    #[test]
    fn build_apikey_headers_allows_empty_key_for_no_auth_mode() {
        let result = build_apikey_headers(&json!({
            "auth": {
                "type": "apikey",
                "api_key": "   "
            }
        }))
        .expect("headers");

        assert_eq!(result, json!({}));
    }

    #[test]
    fn build_apikey_headers_rejects_unsupported_auth_type() {
        assert!(build_apikey_headers(&json!({
            "auth": {
                "type": "oauth",
                "api_key": "sk-example"
            }
        }))
        .is_none());
    }
}
