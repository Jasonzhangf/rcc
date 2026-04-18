use crate::runtime_metadata::{
    attach_provider_runtime_metadata, merge_runtime_metadata, normalize_client_headers_map,
    read_trimmed_string, string_map_to_value_map,
};
use serde_json::{json, Map, Value};
use std::collections::BTreeMap;

pub fn preprocess_provider_request(payload: &Value) -> Option<Value> {
    let record = payload.as_object()?;
    let request = record.get("request").and_then(Value::as_object)?.clone();
    let request_metadata = request.get("metadata").and_then(Value::as_object).cloned();
    let request_headers = request_metadata
        .as_ref()
        .and_then(|metadata| metadata.get("clientHeaders"))
        .and_then(normalize_client_headers_map);

    let runtime_metadata_input = record
        .get("runtime_metadata")
        .and_then(Value::as_object)
        .cloned()
        .unwrap_or_default();
    let runtime_metadata_headers = runtime_metadata_input
        .get("metadata")
        .and_then(Value::as_object)
        .and_then(|metadata| metadata.get("clientHeaders"))
        .and_then(normalize_client_headers_map);

    let effective_client_headers = request_headers.or(runtime_metadata_headers);
    let runtime_metadata = build_runtime_metadata_for_preprocess(
        &request,
        runtime_metadata_input,
        effective_client_headers.clone(),
    );

    let attached = attach_provider_runtime_metadata(&json!({
        "request": Value::Object(request.clone()),
        "runtime_metadata": Value::Object(runtime_metadata.clone()),
    }))?;
    let attached_request = attached.get("request").and_then(Value::as_object)?.clone();
    let mut processed_request = attached_request.clone();

    let entry_endpoint = request_metadata
        .as_ref()
        .and_then(|metadata| read_trimmed_string(metadata, &["entryEndpoint"]))
        .or_else(|| read_trimmed_string(&request, &["entryEndpoint"]));
    let stream_flag = request_metadata
        .as_ref()
        .and_then(|metadata| metadata.get("stream"))
        .and_then(Value::as_bool)
        .or_else(|| request.get("stream").and_then(Value::as_bool));
    let inbound_model = read_trimmed_string(&request, &["model"]);

    let mut processed_metadata = request_metadata.unwrap_or_default();
    if let Some(entry_endpoint) = entry_endpoint {
        processed_metadata.insert("entryEndpoint".to_string(), Value::String(entry_endpoint));
    }
    if let Some(stream_flag) = stream_flag {
        processed_metadata.insert("stream".to_string(), Value::Bool(stream_flag));
    }
    if let Some(client_headers) = effective_client_headers {
        processed_metadata.insert(
            "clientHeaders".to_string(),
            Value::Object(
                client_headers
                    .into_iter()
                    .map(|(key, value)| (key, Value::String(value)))
                    .collect(),
            ),
        );
    }
    processed_metadata.insert(
        "__origModel".to_string(),
        inbound_model.map(Value::String).unwrap_or(Value::Null),
    );
    processed_request.insert("metadata".to_string(), Value::Object(processed_metadata));

    Some(json!({
        "request": Value::Object(processed_request),
        "runtime_metadata": Value::Object(runtime_metadata),
    }))
}

fn build_runtime_metadata_for_preprocess(
    request: &Map<String, Value>,
    runtime_metadata_input: Map<String, Value>,
    effective_client_headers: Option<BTreeMap<String, String>>,
) -> Map<String, Value> {
    let mut runtime_metadata = merge_runtime_metadata(None, &runtime_metadata_input);
    if effective_client_headers.is_none() {
        return runtime_metadata;
    }

    let mut metadata = runtime_metadata
        .get("metadata")
        .and_then(Value::as_object)
        .cloned()
        .unwrap_or_default();
    metadata.insert(
        "clientHeaders".to_string(),
        Value::Object(string_map_to_value_map(
            &effective_client_headers.expect("effective_client_headers presence already checked"),
        )),
    );
    if !metadata.contains_key("entryEndpoint") {
        let entry_endpoint = request
            .get("metadata")
            .and_then(Value::as_object)
            .and_then(|record| read_trimmed_string(record, &["entryEndpoint"]))
            .or_else(|| read_trimmed_string(request, &["entryEndpoint"]));
        if let Some(entry_endpoint) = entry_endpoint {
            metadata.insert("entryEndpoint".to_string(), Value::String(entry_endpoint));
        }
    }
    runtime_metadata.insert("metadata".to_string(), Value::Object(metadata));
    runtime_metadata
}

#[cfg(test)]
mod tests {
    use super::preprocess_provider_request;
    use crate::runtime_metadata::PROVIDER_RUNTIME_METADATA_KEY;
    use serde_json::json;

    #[test]
    fn preprocess_provider_request_projects_allowed_metadata_fields() {
        let result = preprocess_provider_request(&json!({
            "request": {
                "model": "gpt-5",
                "stream": true,
                "metadata": {
                    "entryEndpoint": "/v1/responses",
                    "clientHeaders": {
                        "x-trace-id": "trace-1"
                    }
                }
            },
            "runtime_metadata": {
                "requestId": "req-1",
                "providerKey": "openai",
                "metadata": {
                    "clientRequestId": "client-1",
                    "clientHeaders": {
                        "x-trace-id": "trace-2",
                        "x-client": "codex"
                    }
                }
            }
        }))
        .expect("preprocess");

        assert_eq!(
            result["request"]["metadata"]["entryEndpoint"],
            json!("/v1/responses")
        );
        assert_eq!(result["request"]["metadata"]["stream"], json!(true));
        assert_eq!(result["request"]["metadata"]["__origModel"], json!("gpt-5"));
        assert_eq!(
            result["request"]["metadata"]["clientHeaders"],
            json!({
                "x-trace-id": "trace-1"
            })
        );
        assert!(result["request"]
            .get(PROVIDER_RUNTIME_METADATA_KEY)
            .is_none());
    }

    #[test]
    fn preprocess_provider_request_updates_runtime_metadata_with_effective_headers() {
        let result = preprocess_provider_request(&json!({
            "request": {
                "model": "gpt-5",
                "metadata": {
                    "clientHeaders": {
                        "x-trace-id": "trace-1"
                    }
                }
            },
            "runtime_metadata": {
                "metadata": {
                    "clientRequestId": "client-1",
                    "clientHeaders": {
                        "x-trace-id": "trace-2",
                        "x-client": "codex"
                    }
                }
            }
        }))
        .expect("preprocess");

        assert_eq!(
            result["runtime_metadata"]["metadata"]["clientHeaders"],
            json!({
                "x-trace-id": "trace-1"
            })
        );
        assert_eq!(
            result["runtime_metadata"]["metadata"]["clientRequestId"],
            json!("client-1")
        );
    }

    #[test]
    fn preprocess_provider_request_falls_back_to_runtime_headers_when_request_has_none() {
        let result = preprocess_provider_request(&json!({
            "request": {
                "model": "gpt-5"
            },
            "runtime_metadata": {
                "metadata": {
                    "clientHeaders": {
                        "x-client": "codex"
                    }
                }
            }
        }))
        .expect("preprocess");

        assert_eq!(
            result["request"]["metadata"]["clientHeaders"],
            json!({
                "x-client": "codex"
            })
        );
    }
}
