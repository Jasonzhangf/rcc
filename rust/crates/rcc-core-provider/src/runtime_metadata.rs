use serde_json::{json, Map, Value};
use std::collections::BTreeMap;

pub const PROVIDER_RUNTIME_METADATA_KEY: &str = "__provider_runtime_metadata";

pub fn attach_provider_runtime_metadata(payload: &Value) -> Option<Value> {
    let record = payload.as_object()?;
    let request = record.get("request").and_then(Value::as_object)?.clone();
    let runtime_metadata = record
        .get("runtime_metadata")
        .and_then(Value::as_object)?
        .clone();
    let previous = request
        .get(PROVIDER_RUNTIME_METADATA_KEY)
        .and_then(Value::as_object)
        .cloned();
    let merged = merge_runtime_metadata(previous.as_ref(), &runtime_metadata);

    Some(json!({
        "request": request,
        "runtime_metadata": Value::Object(merged),
    }))
}

pub fn extract_provider_runtime_metadata(payload: &Value) -> Option<Value> {
    let runtime_metadata = extract_runtime_metadata_map(payload)?;
    Some(json!({
        "runtime_metadata": Value::Object(runtime_metadata),
    }))
}

pub fn extract_entry_endpoint(payload: &Value) -> Option<Value> {
    let request = resolve_request_record(payload)?;
    let runtime_metadata = extract_runtime_metadata_map(payload);

    let entry_endpoint = runtime_metadata
        .as_ref()
        .and_then(extract_entry_endpoint_from_runtime_map)
        .or_else(|| extract_entry_endpoint_from_request(request))?;

    Some(json!({
        "entry_endpoint": entry_endpoint,
    }))
}

pub fn extract_client_request_id(payload: &Value) -> Option<Value> {
    let runtime_metadata = extract_runtime_metadata_map(payload)?;
    let metadata = runtime_metadata
        .get("metadata")
        .and_then(Value::as_object)?;
    let client_request_id = read_trimmed_string(metadata, &["clientRequestId"])?;

    Some(json!({
        "client_request_id": client_request_id,
    }))
}

pub fn normalize_client_headers(payload: &Value) -> Option<Value> {
    let record = payload.as_object()?;
    let value = record.get("headers")?;
    let normalized = normalize_client_headers_map(value)?;
    Some(Value::Object(string_map_to_value_map(&normalized)))
}

pub(crate) fn merge_runtime_metadata(
    previous: Option<&Map<String, Value>>,
    next: &Map<String, Value>,
) -> Map<String, Value> {
    let mut merged = previous.cloned().unwrap_or_default();
    for (key, value) in next {
        merged.insert(key.clone(), value.clone());
    }
    merged
}

pub(crate) fn extract_runtime_metadata_map(payload: &Value) -> Option<Map<String, Value>> {
    let record = payload.as_object()?;
    if let Some(runtime_metadata) = record.get("runtime_metadata").and_then(Value::as_object) {
        return Some(runtime_metadata.clone());
    }

    record
        .get("request")
        .and_then(Value::as_object)
        .and_then(|request| {
            request
                .get(PROVIDER_RUNTIME_METADATA_KEY)
                .and_then(Value::as_object)
        })
        .cloned()
}

pub(crate) fn resolve_request_record(payload: &Value) -> Option<&Map<String, Value>> {
    let record = payload.as_object()?;
    record
        .get("request")
        .and_then(Value::as_object)
        .or(Some(record))
}

pub(crate) fn normalize_client_headers_map(value: &Value) -> Option<BTreeMap<String, String>> {
    let raw = value.as_object()?;
    let mut normalized = BTreeMap::new();
    for (key, value) in raw {
        if let Some(text) = value
            .as_str()
            .map(str::trim)
            .filter(|text| !text.is_empty())
        {
            normalized.insert(key.clone(), text.to_string());
        }
    }
    (!normalized.is_empty()).then_some(normalized)
}

pub(crate) fn string_map_to_value_map(source: &BTreeMap<String, String>) -> Map<String, Value> {
    source
        .iter()
        .map(|(key, value)| (key.clone(), Value::String(value.clone())))
        .collect()
}

pub(crate) fn extract_entry_endpoint_from_runtime_map(
    runtime_metadata: &Map<String, Value>,
) -> Option<String> {
    runtime_metadata
        .get("metadata")
        .and_then(Value::as_object)
        .and_then(|metadata| read_trimmed_string(metadata, &["entryEndpoint"]))
}

pub(crate) fn extract_entry_endpoint_from_request(request: &Map<String, Value>) -> Option<String> {
    request
        .get("metadata")
        .and_then(Value::as_object)
        .and_then(|metadata| read_trimmed_string(metadata, &["entryEndpoint"]))
        .or_else(|| read_trimmed_string(request, &["entryEndpoint"]))
}

pub(crate) fn read_trimmed_string(record: &Map<String, Value>, keys: &[&str]) -> Option<String> {
    keys.iter()
        .filter_map(|key| record.get(*key).and_then(Value::as_str))
        .map(str::trim)
        .find(|value| !value.is_empty())
        .map(ToOwned::to_owned)
}

#[cfg(test)]
mod tests {
    use super::{
        attach_provider_runtime_metadata, extract_client_request_id, extract_entry_endpoint,
        extract_provider_runtime_metadata, normalize_client_headers, PROVIDER_RUNTIME_METADATA_KEY,
    };
    use serde_json::json;

    #[test]
    fn attach_provider_runtime_metadata_merges_with_existing_carrier() {
        let result = attach_provider_runtime_metadata(&json!({
            "request": {
                PROVIDER_RUNTIME_METADATA_KEY: {
                    "requestId": "req-old",
                    "providerKey": "old"
                }
            },
            "runtime_metadata": {
                "providerKey": "openai",
                "providerType": "openai"
            }
        }))
        .expect("attach");

        assert_eq!(result["runtime_metadata"]["requestId"], json!("req-old"));
        assert_eq!(result["runtime_metadata"]["providerKey"], json!("openai"));
        assert_eq!(result["runtime_metadata"]["providerType"], json!("openai"));
    }

    #[test]
    fn extract_provider_runtime_metadata_reads_top_level_carrier() {
        let result = extract_provider_runtime_metadata(&json!({
            "runtime_metadata": {
                "requestId": "req-1"
            }
        }))
        .expect("extract");

        assert_eq!(
            result,
            json!({ "runtime_metadata": { "requestId": "req-1" } })
        );
    }

    #[test]
    fn extract_entry_endpoint_prefers_runtime_then_request_metadata() {
        let result = extract_entry_endpoint(&json!({
            "request": {
                "metadata": {
                    "entryEndpoint": "/from-request"
                }
            },
            "runtime_metadata": {
                "metadata": {
                    "entryEndpoint": "/from-runtime"
                }
            }
        }))
        .expect("entry endpoint");

        assert_eq!(result, json!({ "entry_endpoint": "/from-runtime" }));
    }

    #[test]
    fn extract_client_request_id_reads_runtime_metadata() {
        let result = extract_client_request_id(&json!({
            "runtime_metadata": {
                "metadata": {
                    "clientRequestId": "client-1"
                }
            }
        }))
        .expect("client request id");

        assert_eq!(result, json!({ "client_request_id": "client-1" }));
    }

    #[test]
    fn normalize_client_headers_drops_empty_and_non_string_values() {
        let result = normalize_client_headers(&json!({
            "headers": {
                "x-one": "a",
                "x-empty": "  ",
                "x-num": 1
            }
        }))
        .expect("headers");

        assert_eq!(result, json!({ "x-one": "a" }));
    }
}
