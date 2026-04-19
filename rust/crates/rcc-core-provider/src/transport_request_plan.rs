use crate::auth_apikey::build_apikey_headers_map;
use serde_json::{json, Map, Value};

pub const DEFAULT_PROVIDER_TIMEOUT_MS: i64 = 60_000;

pub fn resolve_effective_base_url(payload: &Value) -> Option<Value> {
    let record = payload.as_object()?;
    let provider = record.get("provider").and_then(Value::as_object);
    let runtime = record.get("runtime").and_then(Value::as_object);
    let service = record.get("service").and_then(Value::as_object);
    let base_url = resolve_effective_base_url_str(runtime, provider, service)?;
    Some(json!({ "base_url": base_url }))
}

pub fn resolve_effective_endpoint(payload: &Value) -> Option<Value> {
    let record = payload.as_object()?;
    let provider = record.get("provider").and_then(Value::as_object);
    let runtime = record.get("runtime").and_then(Value::as_object);
    let service = record.get("service").and_then(Value::as_object);
    let endpoint = resolve_effective_endpoint_str(runtime, provider, service);
    Some(json!({ "endpoint": endpoint }))
}

pub fn build_transport_request_plan(payload: &Value) -> Option<Value> {
    let record = payload.as_object()?;
    let provider = record.get("provider").and_then(Value::as_object)?;
    let runtime = record.get("runtime").and_then(Value::as_object);
    let service = record.get("service").and_then(Value::as_object);
    let body = record.get("request_body")?.clone();

    let base_url = resolve_effective_base_url_str(runtime, Some(provider), service)?;
    let endpoint = resolve_effective_endpoint_str(runtime, Some(provider), service);
    let timeout_ms = resolve_timeout_ms(runtime, Some(provider), service);
    let auth = runtime
        .and_then(|value| value.get("auth"))
        .and_then(Value::as_object)
        .or_else(|| provider.get("auth").and_then(Value::as_object))
        .or_else(|| {
            service
                .and_then(|value| value.get("auth"))
                .and_then(Value::as_object)
        });

    let mut headers = resolve_static_headers(runtime, Some(provider), service);
    headers.extend(build_apikey_headers_map(auth)?);
    if !has_header(&headers, "Content-Type") {
        headers.insert(
            "Content-Type".to_string(),
            Value::String("application/json".to_string()),
        );
    }

    Some(json!({
        "method": "POST",
        "target_url": join_base_url_and_endpoint(&base_url, &endpoint),
        "headers": Value::Object(headers),
        "body": body,
        "timeout_ms": timeout_ms,
    }))
}

pub(crate) fn resolve_effective_base_url_str(
    runtime: Option<&Map<String, Value>>,
    provider: Option<&Map<String, Value>>,
    service: Option<&Map<String, Value>>,
) -> Option<String> {
    first_non_empty_string([
        runtime.and_then(|value| value.get("base_url")),
        runtime.and_then(|value| value.get("baseUrl")),
        provider.and_then(|value| value.get("base_url")),
        provider.and_then(|value| value.get("baseUrl")),
        service.and_then(|value| value.get("base_url")),
        service.and_then(|value| value.get("baseUrl")),
    ])
}

pub(crate) fn resolve_effective_endpoint_str(
    runtime: Option<&Map<String, Value>>,
    provider: Option<&Map<String, Value>>,
    service: Option<&Map<String, Value>>,
) -> String {
    first_non_empty_string([
        runtime.and_then(|value| value.get("endpoint")),
        provider.and_then(|value| value.get("endpoint")),
        service.and_then(|value| value.get("endpoint")),
    ])
    .unwrap_or_else(|| "/".to_string())
}

pub(crate) fn resolve_timeout_ms(
    runtime: Option<&Map<String, Value>>,
    provider: Option<&Map<String, Value>>,
    service: Option<&Map<String, Value>>,
) -> i64 {
    [
        runtime.and_then(|value| value.get("timeout_ms")),
        runtime.and_then(|value| value.get("timeoutMs")),
        provider.and_then(|value| value.get("timeout_ms")),
        provider.and_then(|value| value.get("timeoutMs")),
        service.and_then(|value| value.get("timeout_ms")),
        service.and_then(|value| value.get("timeoutMs")),
    ]
    .into_iter()
    .flatten()
    .find_map(read_timeout_ms)
    .unwrap_or(DEFAULT_PROVIDER_TIMEOUT_MS)
}

fn first_non_empty_string<'a>(
    values: impl IntoIterator<Item = Option<&'a Value>>,
) -> Option<String> {
    values
        .into_iter()
        .flatten()
        .filter_map(Value::as_str)
        .map(str::trim)
        .find(|value| !value.is_empty())
        .map(ToOwned::to_owned)
}

fn read_timeout_ms(value: &Value) -> Option<i64> {
    match value {
        Value::Number(number) => number.as_f64(),
        _ => None,
    }
    .filter(|value| value.is_finite())
    .map(|value| value.floor().max(0.0) as i64)
}

fn join_base_url_and_endpoint(base_url: &str, endpoint: &str) -> String {
    let base = base_url.trim().trim_end_matches('/');
    let suffix = endpoint.trim();
    if suffix.is_empty() || suffix == "/" {
        return base.to_string();
    }
    format!("{}/{}", base, suffix.trim_start_matches('/'))
}

fn resolve_static_headers(
    runtime: Option<&Map<String, Value>>,
    provider: Option<&Map<String, Value>>,
    service: Option<&Map<String, Value>>,
) -> Map<String, Value> {
    let mut headers = Map::new();
    for scope in [service, provider, runtime].into_iter().flatten() {
        if let Some(scope_headers) = scope.get("headers").and_then(Value::as_object) {
            for (key, value) in scope_headers {
                if let Some(text) = value
                    .as_str()
                    .map(str::trim)
                    .filter(|text| !text.is_empty())
                {
                    headers.insert(key.clone(), Value::String(text.to_string()));
                }
            }
        }
    }
    headers
}

fn has_header(headers: &Map<String, Value>, name: &str) -> bool {
    headers.keys().any(|key| key.eq_ignore_ascii_case(name))
}

#[cfg(test)]
mod tests {
    use super::{
        build_transport_request_plan, resolve_effective_base_url, resolve_effective_endpoint,
        DEFAULT_PROVIDER_TIMEOUT_MS,
    };
    use serde_json::json;

    #[test]
    fn resolve_effective_base_url_prefers_runtime_provider_then_service() {
        let result = resolve_effective_base_url(&json!({
            "runtime": { "base_url": "https://runtime.example.com/v1" },
            "provider": { "base_url": "https://provider.example.com/v1" },
            "service": { "base_url": "https://service.example.com/v1" }
        }))
        .expect("base_url");
        assert_eq!(
            result,
            json!({"base_url": "https://runtime.example.com/v1"})
        );

        let fallback = resolve_effective_base_url(&json!({
            "provider": { "base_url": "https://provider.example.com/v1" },
            "service": { "base_url": "https://service.example.com/v1" }
        }))
        .expect("base_url");
        assert_eq!(
            fallback,
            json!({"base_url": "https://provider.example.com/v1"})
        );
    }

    #[test]
    fn resolve_effective_endpoint_prefers_runtime_provider_then_service() {
        let result = resolve_effective_endpoint(&json!({
            "runtime": { "endpoint": "/runtime" },
            "provider": { "endpoint": "/provider" },
            "service": { "endpoint": "/service" }
        }))
        .expect("endpoint");
        assert_eq!(result, json!({"endpoint": "/runtime"}));
    }

    #[test]
    fn build_transport_request_plan_assembles_target_url_and_headers() {
        let result = build_transport_request_plan(&json!({
            "provider": {
                "base_url": "https://api.example.com/v1/",
                "endpoint": "/chat/completions",
                "timeout_ms": 60000,
                "auth": {
                    "type": "apikey",
                    "api_key": "sk-example"
                }
            },
            "request_body": {
                "model": "gpt-5",
                "messages": []
            }
        }))
        .expect("plan");

        assert_eq!(result["method"], json!("POST"));
        assert_eq!(
            result["target_url"],
            json!("https://api.example.com/v1/chat/completions")
        );
        assert_eq!(
            result["headers"]["Authorization"],
            json!("Bearer sk-example")
        );
        assert_eq!(result["headers"]["Content-Type"], json!("application/json"));
        assert_eq!(result["timeout_ms"], json!(60000));
    }

    #[test]
    fn build_transport_request_plan_supports_custom_header_and_default_timeout() {
        let result = build_transport_request_plan(&json!({
            "provider": {
                "base_url": "https://api.example.com",
                "endpoint": "chat/completions",
                "auth": {
                    "type": "apikey",
                    "api_key": "token-1",
                    "header_name": "x-api-key"
                }
            },
            "request_body": {
                "model": "gpt-5"
            }
        }))
        .expect("plan");

        assert_eq!(result["headers"]["x-api-key"], json!("token-1"));
        assert_eq!(result["timeout_ms"], json!(DEFAULT_PROVIDER_TIMEOUT_MS));
    }

    #[test]
    fn build_transport_request_plan_merges_static_headers_before_auth_and_content_type() {
        let result = build_transport_request_plan(&json!({
            "provider": {
                "base_url": "https://api.anthropic.com",
                "endpoint": "/v1/messages",
                "headers": {
                    "anthropic-version": "2023-06-01"
                },
                "auth": {
                    "type": "apikey",
                    "api_key": "sk-anthropic",
                    "header_name": "x-api-key",
                    "prefix": ""
                }
            },
            "request_body": {
                "model": "claude-sonnet-4-5",
                "messages": []
            }
        }))
        .expect("plan");

        assert_eq!(result["headers"]["anthropic-version"], json!("2023-06-01"));
        assert_eq!(result["headers"]["x-api-key"], json!("sk-anthropic"));
        assert_eq!(result["headers"]["Content-Type"], json!("application/json"));
    }

    #[test]
    fn build_transport_request_plan_allows_no_auth_mode() {
        let result = build_transport_request_plan(&json!({
            "provider": {
                "base_url": "https://api.example.com",
                "endpoint": "/chat/completions",
                "auth": {
                    "type": "apikey",
                    "api_key": ""
                }
            },
            "request_body": {
                "model": "gpt-5"
            }
        }))
        .expect("plan");

        assert!(result["headers"].get("Authorization").is_none());
        assert_eq!(result["headers"]["Content-Type"], json!("application/json"));
    }

    #[test]
    fn build_transport_request_plan_rejects_unsupported_auth_type() {
        assert!(build_transport_request_plan(&json!({
            "provider": {
                "base_url": "https://api.example.com",
                "endpoint": "/chat/completions",
                "auth": {
                    "type": "oauth",
                    "api_key": "sk-example"
                }
            },
            "request_body": {
                "model": "gpt-5"
            }
        }))
        .is_none());
    }
}
