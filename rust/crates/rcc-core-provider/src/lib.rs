mod auth_apikey;
mod http_execute;
mod http_retry;
mod request_preprocessor;
mod runtime_metadata;
mod sse_transport;
mod transport_request_plan;

pub use auth_apikey::build_apikey_headers;
pub use http_execute::execute_transport_request;
pub use http_retry::{
    get_http_retry_limit, resolve_http_retry_delay_ms, should_retry_http_error,
    DEFAULT_HTTP_MAX_ATTEMPTS,
};
use rcc_core_domain::{ProviderRequestCarrier, ProviderResponseCarrier, ProviderRuntime};
pub use request_preprocessor::preprocess_provider_request;
pub use runtime_metadata::{
    attach_provider_runtime_metadata, extract_client_request_id, extract_entry_endpoint,
    extract_provider_runtime_metadata, normalize_client_headers, PROVIDER_RUNTIME_METADATA_KEY,
};
use serde_json::{json, Value};
pub use sse_transport::{
    execute_sse_transport_request, prepare_sse_request_body, resolve_wants_upstream_sse,
    wrap_upstream_sse_response,
};
use std::collections::BTreeMap;
pub use transport_request_plan::{
    build_transport_request_plan, resolve_effective_base_url, resolve_effective_endpoint,
    DEFAULT_PROVIDER_TIMEOUT_MS,
};

#[derive(Debug, Default)]
pub struct NoopProviderRuntime;

#[derive(Debug, Clone)]
pub struct TransportProviderRuntime {
    provider_config: Value,
    runtime_overrides: Option<Value>,
    service_defaults: Option<Value>,
    retry_config: Value,
}

#[derive(Debug, Clone)]
pub struct TransportProviderRegistryRuntime {
    default: TransportProviderRuntime,
    transports: BTreeMap<String, TransportProviderRuntime>,
}

impl TransportProviderRuntime {
    pub fn new(provider_config: Value) -> Self {
        Self {
            provider_config,
            runtime_overrides: None,
            service_defaults: None,
            retry_config: json!({
                "max_attempts": 1
            }),
        }
    }

    pub fn with_runtime_overrides(mut self, runtime_overrides: Value) -> Self {
        self.runtime_overrides = Some(runtime_overrides);
        self
    }

    pub fn with_service_defaults(mut self, service_defaults: Value) -> Self {
        self.service_defaults = Some(service_defaults);
        self
    }

    pub fn with_retry_config(mut self, retry_config: Value) -> Self {
        self.retry_config = retry_config;
        self
    }

    fn build_request_plan_payload(&self, request: &ProviderRequestCarrier) -> Value {
        let mut payload = json!({
            "provider": self.provider_config,
            "request_body": request.body,
        });

        if let Some(record) = payload.as_object_mut() {
            if let Some(runtime) = &self.runtime_overrides {
                record.insert("runtime".to_string(), runtime.clone());
            }
            if let Some(service) = &self.service_defaults {
                record.insert("service".to_string(), service.clone());
            }
        }

        payload
    }

    fn map_execute_result(&self, result: Option<Value>) -> ProviderResponseCarrier {
        let fallback_error = json!({
            "kind": "provider_runtime",
            "code": "PROVIDER_RUNTIME_ERROR",
            "message": "provider execute returned no result",
        });
        let execute_result = result.unwrap_or_else(|| {
            json!({
                "ok": false,
                "error": fallback_error,
                "attempts": 1
            })
        });

        if execute_result
            .get("ok")
            .and_then(Value::as_bool)
            .unwrap_or(false)
        {
            return ProviderResponseCarrier {
                runtime: self.runtime_name().to_string(),
                status: "completed".to_string(),
                body: execute_result.get("body").cloned().unwrap_or(Value::Null),
                headers: execute_result
                    .get("headers")
                    .cloned()
                    .unwrap_or_else(|| json!({})),
                raw_stream_carrier: Value::Null,
            };
        }

        let error = execute_result
            .get("error")
            .cloned()
            .unwrap_or_else(|| fallback_error.clone());
        let message = error
            .get("message")
            .and_then(Value::as_str)
            .unwrap_or("provider execute failed");

        ProviderResponseCarrier {
            runtime: self.runtime_name().to_string(),
            status: "failed".to_string(),
            body: json!({
                "text": message,
                "error": error,
            }),
            headers: json!({}),
            raw_stream_carrier: Value::Null,
        }
    }
}

impl TransportProviderRegistryRuntime {
    pub fn new(default: TransportProviderRuntime) -> Self {
        Self {
            default,
            transports: BTreeMap::new(),
        }
    }

    pub fn with_target_runtime(
        mut self,
        target: impl Into<String>,
        runtime: TransportProviderRuntime,
    ) -> Self {
        self.transports.insert(target.into(), runtime);
        self
    }

    pub fn with_target_runtimes(
        mut self,
        runtimes: BTreeMap<String, TransportProviderRuntime>,
    ) -> Self {
        self.transports.extend(runtimes);
        self
    }

    fn missing_target_response(&self, selected_target: &str) -> ProviderResponseCarrier {
        ProviderResponseCarrier {
            runtime: self.runtime_name().to_string(),
            status: "failed".to_string(),
            body: json!({
                "text": format!("provider target `{selected_target}` not configured"),
                "error": {
                    "kind": "provider_runtime",
                    "code": "PROVIDER_TARGET_NOT_CONFIGURED",
                    "message": format!("selected_target `{selected_target}` was not found in provider runtime registry"),
                    "selected_target": selected_target,
                }
            }),
            headers: json!({}),
            raw_stream_carrier: Value::Null,
        }
    }
}

impl ProviderRuntime for NoopProviderRuntime {
    fn runtime_name(&self) -> &'static str {
        "noop-runtime"
    }

    fn execute(&self, request: &ProviderRequestCarrier) -> ProviderResponseCarrier {
        let text = format!(
            "runtime={} operation={} body={}",
            self.runtime_name(),
            request.operation,
            request.body.to_string()
        );

        ProviderResponseCarrier {
            runtime: self.runtime_name().to_string(),
            status: "completed".to_string(),
            body: json!({
                "text": text,
            }),
            headers: json!({}),
            raw_stream_carrier: Value::Null,
        }
    }
}

impl ProviderRuntime for TransportProviderRuntime {
    fn runtime_name(&self) -> &'static str {
        "transport-runtime"
    }

    fn execute(&self, request: &ProviderRequestCarrier) -> ProviderResponseCarrier {
        let request_plan = build_transport_request_plan(&self.build_request_plan_payload(request));
        let execute_result = request_plan.as_ref().and_then(|request_plan| {
            execute_transport_request(&json!({
                "request_plan": request_plan,
                "retry": self.retry_config,
            }))
        });

        self.map_execute_result(execute_result)
    }
}

impl ProviderRuntime for TransportProviderRegistryRuntime {
    fn runtime_name(&self) -> &'static str {
        "transport-runtime"
    }

    fn execute(&self, request: &ProviderRequestCarrier) -> ProviderResponseCarrier {
        let selected_target = request
            .route
            .as_ref()
            .and_then(|route| route.selected_target.as_deref())
            .map(str::trim)
            .filter(|target| !target.is_empty());

        match selected_target {
            Some(target) => match self.transports.get(target) {
                Some(runtime) => runtime.execute(request),
                None => self.missing_target_response(target),
            },
            None => self.default.execute(request),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{NoopProviderRuntime, TransportProviderRegistryRuntime, TransportProviderRuntime};
    use rcc_core_domain::{ProviderRequestCarrier, ProviderRouteHandoff, ProviderRuntime};
    use serde_json::json;
    use std::io::{Read, Write};
    use std::net::{Shutdown, TcpListener};
    use std::thread;
    use std::time::Duration;

    #[test]
    fn noop_provider_runtime_returns_minimal_provider_response_carrier() {
        let runtime = NoopProviderRuntime::default();
        let response = runtime.execute(&ProviderRequestCarrier {
            operation: "responses".to_string(),
            body: json!({
                "model": "gpt-5",
                "input": "继续执行",
            }),
            metadata: json!({}),
            route: None,
        });

        assert_eq!(response.runtime, "noop-runtime");
        assert_eq!(response.status, "completed");
        assert!(response.body["text"]
            .as_str()
            .unwrap_or("")
            .contains("runtime=noop-runtime operation=responses body="));
    }

    #[test]
    fn transport_provider_runtime_executes_minimal_http_request() {
        let listener = TcpListener::bind("127.0.0.1:0").expect("bind provider runtime server");
        let addr = listener.local_addr().expect("provider runtime addr");
        let handle = thread::spawn(move || {
            let (mut stream, _) = listener.accept().expect("accept provider runtime");
            stream
                .set_read_timeout(Some(Duration::from_millis(1_500)))
                .expect("set provider runtime timeout");
            let _ = drain_http_request(&mut stream);
            let body = "{\"text\":\"provider-real-execute\"}";
            let response = format!(
                "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\n\r\n{body}",
                body.len()
            );
            let _ = stream.write_all(response.as_bytes());
            let _ = stream.flush();
            let _ = stream.shutdown(Shutdown::Both);
        });

        let runtime = TransportProviderRuntime::new(json!({
            "base_url": format!("http://{}", addr),
            "endpoint": "/v1/responses",
            "auth": {
                "type": "apikey",
                "api_key": ""
            }
        }));
        let response = runtime.execute(&ProviderRequestCarrier {
            operation: "responses".to_string(),
            body: json!({
                "model": "gpt-5",
                "input": "继续执行"
            }),
            metadata: json!({}),
            route: Some(rcc_core_domain::ProviderRouteHandoff {
                selected_route: Some("multimodal".to_string()),
                selected_target: Some("openai.vision.gpt-4o".to_string()),
            }),
        });

        handle.join().expect("provider runtime join");

        assert_eq!(response.runtime, "transport-runtime");
        assert_eq!(response.status, "completed");
        assert_eq!(response.body["text"], "provider-real-execute");
    }

    #[test]
    fn transport_provider_runtime_keeps_route_handoff_out_of_request_body() {
        let runtime = TransportProviderRuntime::new(json!({
            "base_url": "http://127.0.0.1:1234",
            "endpoint": "/v1/responses",
            "auth": {
                "type": "apikey",
                "api_key": ""
            }
        }));

        let payload = runtime.build_request_plan_payload(&ProviderRequestCarrier {
            operation: "responses".to_string(),
            body: json!({
                "model": "gpt-5",
                "input": "继续执行"
            }),
            metadata: json!({}),
            route: Some(rcc_core_domain::ProviderRouteHandoff {
                selected_route: Some("multimodal".to_string()),
                selected_target: Some("openai.vision.gpt-4o".to_string()),
            }),
        });

        assert_eq!(
            payload["request_body"],
            json!({
                "model": "gpt-5",
                "input": "继续执行"
            })
        );
        assert!(payload.get("route").is_none());
    }

    #[test]
    fn transport_provider_registry_runtime_binds_selected_target() {
        let selected_listener =
            TcpListener::bind("127.0.0.1:0").expect("bind selected provider runtime server");
        let selected_addr = selected_listener
            .local_addr()
            .expect("selected provider runtime addr");
        let selected_handle = thread::spawn(move || {
            let (mut stream, _) = selected_listener
                .accept()
                .expect("accept selected provider runtime");
            stream
                .set_read_timeout(Some(Duration::from_millis(1_500)))
                .expect("set selected provider runtime timeout");
            let _ = drain_http_request(&mut stream);
            let body = "{\"text\":\"selected-provider\"}";
            let response = format!(
                "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\n\r\n{body}",
                body.len()
            );
            let _ = stream.write_all(response.as_bytes());
            let _ = stream.flush();
            let _ = stream.shutdown(Shutdown::Both);
        });

        let runtime = TransportProviderRegistryRuntime::new(TransportProviderRuntime::new(json!({
            "base_url": "http://127.0.0.1:9",
            "endpoint": "/v1/responses",
            "auth": {
                "type": "apikey",
                "api_key": ""
            }
        })))
        .with_target_runtime(
            "beta.vision.gpt-4o",
            TransportProviderRuntime::new(json!({
                "base_url": format!("http://{}", selected_addr),
                "endpoint": "/v1/responses",
                "auth": {
                    "type": "apikey",
                    "api_key": ""
                }
            })),
        );

        let response = runtime.execute(&ProviderRequestCarrier {
            operation: "responses".to_string(),
            body: json!({
                "model": "gpt-5",
                "input": "继续执行"
            }),
            metadata: json!({}),
            route: Some(ProviderRouteHandoff {
                selected_route: Some("multimodal".to_string()),
                selected_target: Some("beta.vision.gpt-4o".to_string()),
            }),
        });

        selected_handle
            .join()
            .expect("selected provider runtime join");

        assert_eq!(response.status, "completed");
        assert_eq!(response.body["text"], "selected-provider");
    }

    #[test]
    fn transport_provider_registry_runtime_fails_when_selected_target_missing() {
        let runtime = TransportProviderRegistryRuntime::new(TransportProviderRuntime::new(json!({
            "base_url": "http://127.0.0.1:1234",
            "endpoint": "/v1/responses",
            "auth": {
                "type": "apikey",
                "api_key": ""
            }
        })));

        let response = runtime.execute(&ProviderRequestCarrier {
            operation: "responses".to_string(),
            body: json!({
                "model": "gpt-5",
                "input": "继续执行"
            }),
            metadata: json!({}),
            route: Some(ProviderRouteHandoff {
                selected_route: Some("multimodal".to_string()),
                selected_target: Some("missing.vision.gpt-4o".to_string()),
            }),
        });

        assert_eq!(response.status, "failed");
        assert_eq!(
            response.body["error"]["code"],
            "PROVIDER_TARGET_NOT_CONFIGURED"
        );
        assert_eq!(
            response.body["error"]["selected_target"],
            "missing.vision.gpt-4o"
        );
    }

    fn drain_http_request(stream: &mut std::net::TcpStream) -> Vec<u8> {
        let mut buffer = [0_u8; 4096];
        let mut request = Vec::new();
        let mut expected_total = None;
        loop {
            match stream.read(&mut buffer) {
                Ok(0) => break,
                Ok(read) => {
                    request.extend_from_slice(&buffer[..read]);
                    if expected_total.is_none() {
                        expected_total = expected_http_request_len(&request);
                    }
                    if let Some(expected_total) = expected_total {
                        if request.len() >= expected_total {
                            break;
                        }
                    }
                }
                Err(_) => break,
            }
        }
        request
    }

    fn expected_http_request_len(request: &[u8]) -> Option<usize> {
        let header_end = request
            .windows(4)
            .position(|window| window == b"\r\n\r\n")?;
        let header_bytes = &request[..header_end + 4];
        let header_text = std::str::from_utf8(header_bytes).ok()?;
        let content_length = header_text
            .lines()
            .find_map(|line| {
                let (name, value) = line.split_once(':')?;
                name.trim()
                    .eq_ignore_ascii_case("content-length")
                    .then(|| value.trim().parse::<usize>().ok())
                    .flatten()
            })
            .unwrap_or(0);
        Some(header_end + 4 + content_length)
    }
}
