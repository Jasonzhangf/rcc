use rcc_core_compat::CompatBlock;
use rcc_core_config::{EffectiveConfig, ProviderRuntimeKind, RouterBootstrapConfig};
use rcc_core_domain::{
    build_responses_cross_protocol_audit, infer_responses_entry_endpoint,
    provider_supports_native_responses_continuation, resolve_responses_target_provider,
    HubCanonicalOutboundRequest, ProviderResponseCarrier, ResponsesContinuationContext,
    TARGET_PROTOCOL_ANTHROPIC, TARGET_PROTOCOL_GEMINI,
};
use rcc_core_domain::{extract_output_text, ProviderRuntime, RequestEnvelope, ResponseEnvelope};
use rcc_core_pipeline::PipelineBlock;
use rcc_core_provider::{
    NoopProviderRuntime, TransportProviderRegistryRuntime, TransportProviderRuntime,
};
use rcc_core_router::{RoutePoolTier, RouterBlock, RoutingPools};
use rcc_core_servertool::ServertoolBlock;
use serde_json::{json, Value};
use std::collections::BTreeMap;

pub struct SkeletonApplication {
    pipeline: PipelineBlock,
    router: RouterBlock,
    servertool: ServertoolBlock,
    compat: CompatBlock,
    provider: Box<dyn ProviderRuntime>,
    target_provider_hints: BTreeMap<String, String>,
    default_provider_hint: Option<String>,
}

impl Default for SkeletonApplication {
    fn default() -> Self {
        Self::with_provider_runtime(NoopProviderRuntime::default())
    }
}

impl SkeletonApplication {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn from_config(config: &EffectiveConfig) -> Self {
        let router =
            RouterBlock::with_routing(routing_pools_from_bootstrap(&config.router.bootstrap));
        let target_provider_hints = config
            .provider
            .runtime
            .registry_transport_provider_families();
        let default_provider_hint = config
            .provider
            .runtime
            .transport_provider_family()
            .map(str::to_string);
        match config.provider.runtime.kind {
            ProviderRuntimeKind::Noop => Self::with_router_provider_and_target_hints(
                router,
                NoopProviderRuntime::default(),
                target_provider_hints,
                default_provider_hint,
            ),
            ProviderRuntimeKind::Transport => {
                let default_runtime =
                    TransportProviderRuntime::new(config.provider.runtime.transport_config_value())
                        .with_retry_config(config.provider.runtime.retry_config_value());
                let target_runtimes = config
                    .provider
                    .runtime
                    .registry_transport_config_values()
                    .into_iter()
                    .map(|(target, transport)| {
                        (
                            target,
                            TransportProviderRuntime::new(transport)
                                .with_retry_config(config.provider.runtime.retry_config_value()),
                        )
                    })
                    .collect();
                let runtime = TransportProviderRegistryRuntime::new(default_runtime)
                    .with_target_runtimes(target_runtimes);
                Self::with_router_provider_and_target_hints(
                    router,
                    runtime,
                    target_provider_hints,
                    default_provider_hint,
                )
            }
        }
    }

    pub fn with_provider_runtime(provider: impl ProviderRuntime + 'static) -> Self {
        Self::with_router_and_provider(RouterBlock::default(), provider)
    }

    pub fn with_router_and_provider(
        router: RouterBlock,
        provider: impl ProviderRuntime + 'static,
    ) -> Self {
        Self::with_router_provider_and_target_hints(router, provider, BTreeMap::new(), None)
    }

    fn with_router_provider_and_target_hints(
        router: RouterBlock,
        provider: impl ProviderRuntime + 'static,
        target_provider_hints: BTreeMap<String, String>,
        default_provider_hint: Option<String>,
    ) -> Self {
        Self {
            pipeline: PipelineBlock::default(),
            router,
            servertool: ServertoolBlock,
            compat: CompatBlock,
            provider: Box::new(provider),
            target_provider_hints,
            default_provider_hint,
        }
    }

    pub fn handle(&self, request: RequestEnvelope) -> ResponseEnvelope {
        let route = self.router.select(&request);
        let tool_plan = self.servertool.plan(&request);
        let provider_response = if request.operation.trim() == "responses" {
            self.handle_responses_canonical(&request, &route)
        } else {
            let prepared = self.pipeline.prepare(request);
            let provider_request = self.compat.map_request(&prepared, Some(&route));
            self.provider.execute(&provider_request)
        };
        let canonical_response = self.compat.map_response(&provider_response);
        let payload = extract_output_text(&canonical_response);

        ResponseEnvelope {
            route,
            tool_plan,
            provider_runtime: self.provider.runtime_name(),
            status: canonical_response.status,
            payload,
            required_action: canonical_response.required_action,
            raw_provider_response: canonical_response.raw_carrier,
        }
    }

    pub fn run_smoke(&self, request: RequestEnvelope) -> ResponseEnvelope {
        self.handle(request)
    }

    fn handle_responses_canonical(
        &self,
        request: &RequestEnvelope,
        route: &rcc_core_domain::RouteDecision,
    ) -> ProviderResponseCarrier {
        let mut canonical = match self.pipeline.inbound_canonical(request.clone()) {
            Ok(canonical) => canonical,
            Err(error) => {
                return synthetic_provider_failure(
                    self.provider.runtime_name(),
                    format!("canonical inbound failed: {error}"),
                );
            }
        };

        if canonical.model.is_none() {
            canonical.model = route.selected_target.clone();
        }
        let target_provider_id = resolve_responses_target_provider(
            self.resolve_target_provider_hint(route),
            route.selected_target.as_deref(),
            canonical.model.as_deref(),
        );
        let provider_supports_native =
            provider_supports_native_responses_continuation(Some(target_provider_id));

        let entry_endpoint = infer_responses_entry_endpoint(&canonical);
        let continuation_context = ResponsesContinuationContext {
            entry_endpoint,
            inbound_provider_id: Some(target_provider_id),
            outbound_provider_id: Some(target_provider_id),
            provider_supports_native,
            response_id: None,
            previous_response_id: None,
        };
        let response_id = canonical.response_id.clone();
        let previous_response_id = canonical.previous_response_id.clone();
        let continuation_context = ResponsesContinuationContext {
            response_id: response_id.as_deref(),
            previous_response_id: previous_response_id.as_deref(),
            ..continuation_context
        };
        let state = match self
            .pipeline
            .chat_process_canonical(canonical, continuation_context)
        {
            Ok(state) => state,
            Err(error) => {
                return synthetic_provider_failure(
                    self.provider.runtime_name(),
                    format!("canonical chat_process failed: {error}"),
                );
            }
        };
        let mut outbound: HubCanonicalOutboundRequest = self
            .pipeline
            .outbound_canonical(state, Some(target_provider_id));
        let outbound_audit = match build_canonical_outbound_protocol_audit(
            &outbound.request.raw_payload_text,
            outbound.request.source_protocol.as_str(),
            target_provider_id,
        ) {
            Ok(audit) => audit,
            Err(error) => {
                return synthetic_provider_failure(
                    self.provider.runtime_name(),
                    format!("canonical audit assembly failed: {error}"),
                );
            }
        };
        outbound.protocol_mapping_audit = outbound_audit;
        let provider_request = match self.compat.map_canonical_request(&outbound, Some(route)) {
            Ok(provider_request) => provider_request,
            Err(error) => {
                return synthetic_provider_failure(
                    self.provider.runtime_name(),
                    format!("canonical compat projection failed: {error}"),
                );
            }
        };

        let provider_response = self.provider.execute(&provider_request);
        if !provider_supports_native {
            let canonical_response = self.compat.map_response(&provider_response);
            let should_record = canonical_response.response_id.is_some()
                || !canonical_response.required_action.is_null();
            if should_record {
                let store_record = json!({
                    "id": canonical_response.response_id,
                    "status": canonical_response.status,
                    "output": canonical_response.output,
                    "required_action": canonical_response.required_action,
                });
                if let Err(error) = self
                    .pipeline
                    .remember_responses_conversation(&outbound.request, &store_record)
                {
                    return synthetic_provider_failure(
                        self.provider.runtime_name(),
                        format!("responses conversation record failed: {error}"),
                    );
                }
            }
        }

        provider_response
    }

    fn resolve_target_provider_hint<'a>(
        &'a self,
        route: &'a rcc_core_domain::RouteDecision,
    ) -> Option<&'a str> {
        route
            .selected_target
            .as_deref()
            .and_then(|target| self.target_provider_hints.get(target).map(String::as_str))
            .or_else(|| {
                route
                    .selected_target
                    .is_none()
                    .then(|| self.default_provider_hint.as_deref())
                    .flatten()
            })
    }
}

fn build_canonical_outbound_protocol_audit(
    raw_payload_text: &str,
    source_protocol: &str,
    target_provider_id: &str,
) -> Result<Option<rcc_core_domain::ProtocolMappingAudit>, String> {
    if source_protocol != rcc_core_domain::HUB_SOURCE_PROTOCOL_RESPONSES {
        return Ok(None);
    }

    let Some(target_protocol) = resolve_protocol_audit_target(target_provider_id) else {
        return Ok(None);
    };
    let payload = serde_json::from_str::<Value>(raw_payload_text)
        .map_err(|error| format!("responses audit requires JSON object payload: {error}"))?;
    let audit = build_responses_cross_protocol_audit(&payload, target_protocol);
    Ok((!audit.is_empty()).then_some(audit))
}

fn resolve_protocol_audit_target(target_provider_id: &str) -> Option<&'static str> {
    match target_provider_id.trim() {
        "anthropic" => Some(TARGET_PROTOCOL_ANTHROPIC),
        "gemini" => Some(TARGET_PROTOCOL_GEMINI),
        _ => None,
    }
}

fn routing_pools_from_bootstrap(bootstrap: &RouterBootstrapConfig) -> RoutingPools {
    bootstrap
        .routes
        .iter()
        .map(|(route_name, tiers)| {
            let pools = tiers
                .iter()
                .map(|tier| RoutePoolTier::new(&tier.id, tier.targets.clone(), tier.priority))
                .collect::<Vec<_>>();
            (route_name.clone(), pools)
        })
        .collect()
}

fn synthetic_provider_failure(runtime: &'static str, message: String) -> ProviderResponseCarrier {
    let text = message.clone();
    ProviderResponseCarrier {
        runtime: runtime.to_string(),
        status: "failed".to_string(),
        body: json!({
            "text": text,
            "error": {
                "kind": "pipeline",
                "code": "CANONICAL_RESPONSES_PIPELINE_ERROR",
                "message": message,
            }
        }),
        headers: json!({}),
        raw_stream_carrier: Value::Null,
    }
}

#[cfg(test)]
mod tests {
    use super::SkeletonApplication;
    use rcc_core_config::load_config;
    use rcc_core_domain::{
        ProviderRequestCarrier, ProviderResponseCarrier, ProviderRouteHandoff, ProviderRuntime,
        RequestEnvelope,
    };
    use rcc_core_provider::TransportProviderRuntime;
    use rcc_core_router::{
        build_route_candidates, RouteCandidateInput, RouteFeatures, RouterBlock,
    };
    use serde_json::json;
    use std::collections::BTreeMap;
    use std::io::{Read, Write};
    use std::net::{Shutdown, TcpListener};
    use std::sync::{Arc, Mutex};
    use std::thread;
    use std::time::Duration;

    #[test]
    fn handle_selects_route_before_pipeline_prepare() {
        let app = SkeletonApplication::new();
        let response = app.handle(RequestEnvelope::new(
            "",
            r#"{"routing":{"target_block":"servertool"}}"#,
        ));

        assert_eq!(response.route.target_block, "servertool");
        assert!(response.payload.contains("operation=smoke"));
        assert_eq!(response.status, "completed");
        assert_eq!(response.raw_provider_response["runtime"], "noop-runtime");
        assert!(response.tool_plan.scheduled.is_empty());
    }

    #[test]
    fn handle_runs_pipeline_compat_and_provider_for_responses_path() {
        let app = SkeletonApplication::new();
        let response = app.handle(RequestEnvelope::new(
            "responses",
            r#"{"model":"gpt-5","input":"继续执行","metadata":{"trace_id":"phase8"}}"#,
        ));

        assert_eq!(response.route.target_block, "pipeline");
        assert_eq!(response.status, "completed");
        assert!(response.payload.contains("operation=responses"));
        assert!(response.payload.contains("\"model\":\"gpt-5\""));
        assert_eq!(response.raw_provider_response["runtime"], "noop-runtime");
        assert_eq!(
            response.raw_provider_response["body"]["text"]
                .as_str()
                .unwrap_or(""),
            response.payload
        );
    }

    #[test]
    fn with_provider_runtime_runs_real_transport_execute_path() {
        let listener = TcpListener::bind("127.0.0.1:0").expect("bind orchestrator server");
        let addr = listener.local_addr().expect("orchestrator addr");
        let handle = thread::spawn(move || {
            let (mut stream, _) = listener.accept().expect("accept orchestrator");
            stream
                .set_read_timeout(Some(Duration::from_millis(1_500)))
                .expect("set orchestrator timeout");
            let _ = drain_http_request(&mut stream);

            let body = "{\"text\":\"orchestrator-real-provider\"}";
            let response = format!(
                "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\n\r\n{body}",
                body.len()
            );
            let _ = stream.write_all(response.as_bytes());
            let _ = stream.flush();
            let _ = stream.shutdown(Shutdown::Both);
        });

        let app =
            SkeletonApplication::with_provider_runtime(TransportProviderRuntime::new(json!({
                "base_url": format!("http://{}", addr),
                "endpoint": "/v1/responses",
                "auth": {
                    "type": "apikey",
                    "api_key": ""
                }
            })));
        let response = app.handle(RequestEnvelope::new(
            "responses",
            r#"{"model":"gpt-5","input":"继续执行"}"#,
        ));

        handle.join().expect("orchestrator join");

        assert_eq!(response.provider_runtime, "transport-runtime");
        assert_eq!(response.status, "completed");
        assert_eq!(response.payload, "orchestrator-real-provider");
        assert_eq!(response.route.target_block, "pipeline");
    }

    #[test]
    fn from_config_bootstraps_transport_runtime_path() {
        let listener = TcpListener::bind("127.0.0.1:0").expect("bind config orchestrator server");
        let addr = listener.local_addr().expect("config orchestrator addr");
        let handle = thread::spawn(move || {
            let (mut stream, _) = listener.accept().expect("accept config orchestrator");
            stream
                .set_read_timeout(Some(Duration::from_millis(1_500)))
                .expect("set config orchestrator timeout");
            let _ = drain_http_request(&mut stream);

            let body = "{\"text\":\"orchestrator-config-runtime\"}";
            let response = format!(
                "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\n\r\n{body}",
                body.len()
            );
            let _ = stream.write_all(response.as_bytes());
            let _ = stream.flush();
            let _ = stream.shutdown(Shutdown::Both);
        });

        let config_path = unique_test_path("orchestrator-config.json");
        std::fs::create_dir_all(config_path.parent().expect("config parent"))
            .expect("create config parent");
        std::fs::write(
            &config_path,
            format!(
                r#"{{
  "provider": {{
    "runtime": {{
      "kind": "transport",
      "transport": {{
        "base_url": "http://{}"
      }}
    }}
  }}
}}"#,
                addr
            ),
        )
        .expect("write orchestrator config");

        let loaded = load_config(Some(config_path.to_str().expect("config path str")))
            .expect("load orchestrator config");
        let app = SkeletonApplication::from_config(&loaded.effective);
        let response = app.handle(RequestEnvelope::new(
            "responses",
            r#"{"model":"gpt-5","input":"继续执行"}"#,
        ));

        handle.join().expect("config orchestrator join");

        assert_eq!(response.provider_runtime, "transport-runtime");
        assert_eq!(response.payload, "orchestrator-config-runtime");
        assert_eq!(response.route.target_block, "pipeline");
    }

    #[test]
    fn from_config_exposes_runtime_router_selection() {
        let config_path = unique_test_path("router-bootstrap-runtime-config.json");
        std::fs::create_dir_all(config_path.parent().expect("config parent"))
            .expect("create config parent");
        std::fs::write(
            &config_path,
            r#"{
  "virtualrouter": {
    "routing": {
      "default": [
        {
          "id": "default-primary",
          "targets": ["openai.primary.gpt-5"]
        },
        {
          "targets": ["anthropic.ops.claude-3"]
        }
      ],
      "multimodal": [
        {
          "targets": ["openai.vision.gpt-4o"]
        }
      ]
    }
  }
}"#,
        )
        .expect("write router bootstrap config");

        let loaded = load_config(Some(config_path.to_str().expect("config path str")))
            .expect("load router bootstrap config");
        let app = SkeletonApplication::from_config(&loaded.effective);
        let response = app.handle(RequestEnvelope::new(
            "responses",
            r#"{
  "input": [
    { "type": "input_text", "text": "继续执行" },
    { "type": "input_image", "image_url": "file://whiteboard.png" }
  ]
}"#,
        ));

        assert_eq!(response.route.target_block, "pipeline");
        assert_eq!(response.route.selected_route.as_deref(), Some("multimodal"));
        assert_eq!(
            response.route.selected_target.as_deref(),
            Some("openai.vision.gpt-4o")
        );
        assert_eq!(
            response.route.candidate_routes,
            vec!["multimodal".to_string(), "default".to_string()]
        );
    }

    #[test]
    fn handle_hands_route_handoff_to_provider_runtime() {
        let observed = Arc::new(Mutex::new(None));
        let app = SkeletonApplication::with_router_and_provider(
            RouterBlock::with_routing(super::routing_pools_from_bootstrap(
                &load_config_value_for_route_handoff(),
            )),
            InspectingProviderRuntime::new(observed.clone()),
        );

        let response = app.handle(RequestEnvelope::new(
            "responses",
            r#"{
  "input": [
    { "type": "input_text", "text": "继续执行" },
    { "type": "input_image", "image_url": "file://whiteboard.png" }
  ]
}"#,
        ));

        assert_eq!(response.route.selected_route.as_deref(), Some("multimodal"));
        assert_eq!(
            observed
                .lock()
                .expect("observed request lock")
                .clone()
                .and_then(|request| request.route),
            Some(ProviderRouteHandoff {
                selected_route: Some("multimodal".to_string()),
                selected_target: Some("openai.vision.gpt-4o".to_string()),
            })
        );
    }

    #[test]
    fn from_config_binds_selected_target_to_runtime_registry() {
        let selected_listener =
            TcpListener::bind("127.0.0.1:0").expect("bind selected target runtime server");
        let selected_addr = selected_listener
            .local_addr()
            .expect("selected target runtime addr");
        let selected_handle = thread::spawn(move || {
            let (mut stream, _) = selected_listener
                .accept()
                .expect("accept selected target runtime");
            stream
                .set_read_timeout(Some(Duration::from_millis(1_500)))
                .expect("set selected target runtime timeout");
            let _ = drain_http_request(&mut stream);

            let body = "{\"text\":\"selected-runtime-registry\"}";
            let response = format!(
                "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\n\r\n{body}",
                body.len()
            );
            let _ = stream.write_all(response.as_bytes());
            let _ = stream.flush();
            let _ = stream.shutdown(Shutdown::Both);
        });

        let config_path = unique_test_path("target-runtime-registry-config.json");
        std::fs::create_dir_all(config_path.parent().expect("config parent"))
            .expect("create config parent");
        std::fs::write(
            &config_path,
            format!(
                r#"{{
  "virtualrouter": {{
    "providers": {{
      "alpha": {{
        "enabled": true,
        "type": "responses",
        "baseURL": "http://127.0.0.1:9",
        "auth": {{
          "type": "apikey",
          "apiKey": ""
        }}
      }},
      "beta": {{
        "enabled": true,
        "type": "responses",
        "baseURL": "http://{}",
        "auth": {{
          "type": "apikey",
          "apiKey": ""
        }}
      }}
    }},
    "routing": {{
      "default": [
        {{
          "targets": ["alpha.gpt-5"]
        }}
      ],
      "multimodal": [
        {{
          "targets": ["beta.vision.gpt-4o"]
        }}
      ]
    }}
  }}
}}"#,
                selected_addr
            ),
        )
        .expect("write target runtime registry config");

        let loaded = load_config(Some(config_path.to_str().expect("config path str")))
            .expect("load target runtime registry config");
        let app = SkeletonApplication::from_config(&loaded.effective);
        let response = app.handle(RequestEnvelope::new(
            "responses",
            r#"{
  "input": [
    { "type": "input_text", "text": "继续执行" },
    { "type": "input_image", "image_url": "file://whiteboard.png" }
  ]
}"#,
        ));

        selected_handle
            .join()
            .expect("selected target runtime join");

        assert_eq!(response.provider_runtime, "transport-runtime");
        assert_eq!(response.status, "completed");
        assert_eq!(response.payload, "selected-runtime-registry");
        assert_eq!(
            response.route.selected_target.as_deref(),
            Some("beta.vision.gpt-4o")
        );
    }

    #[test]
    fn from_config_prefers_registry_provider_family_hint_for_canonical_projection() {
        let observed_request = Arc::new(Mutex::new(String::new()));
        let observed_request_for_thread = observed_request.clone();
        let selected_listener =
            TcpListener::bind("127.0.0.1:0").expect("bind hinted target runtime server");
        let selected_addr = selected_listener
            .local_addr()
            .expect("hinted target runtime addr");
        let selected_handle = thread::spawn(move || {
            let (mut stream, _) = selected_listener
                .accept()
                .expect("accept hinted target runtime");
            stream
                .set_read_timeout(Some(Duration::from_millis(1_500)))
                .expect("set hinted target runtime timeout");
            let request_bytes = drain_http_request(&mut stream);
            *observed_request_for_thread
                .lock()
                .expect("observed hinted request lock") =
                String::from_utf8_lossy(&request_bytes).into_owned();

            let body = "{\"text\":\"anthropic-selected-runtime\"}";
            let response = format!(
                "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\n\r\n{body}",
                body.len()
            );
            let _ = stream.write_all(response.as_bytes());
            let _ = stream.flush();
            let _ = stream.shutdown(Shutdown::Both);
        });

        let config_path = unique_test_path("target-provider-family-hint-config.json");
        std::fs::create_dir_all(config_path.parent().expect("config parent"))
            .expect("create config parent");
        std::fs::write(
            &config_path,
            format!(
                r#"{{
  "provider": {{
    "runtime": {{
      "kind": "transport",
      "transport": {{
        "base_url": "http://127.0.0.1:9",
        "endpoint": "/v1/responses",
        "timeout_ms": 30000,
        "auth": {{
          "type": "apikey",
          "api_key": ""
        }}
      }},
      "registry": {{
        "transports": {{
          "beta.vision.gpt-4o": {{
            "base_url": "http://{}",
            "endpoint": "/v1/messages",
            "timeout_ms": 30000,
            "auth": {{
              "type": "apikey",
              "api_key": "",
              "header_name": "x-api-key",
              "prefix": ""
            }}
          }}
        }}
      }}
    }}
  }},
  "router": {{
    "bootstrap": {{
      "routes": {{
        "multimodal": [
          {{
            "targets": ["beta.vision.gpt-4o"],
            "priority": 10,
            "id": "multimodal-primary"
          }}
        ]
      }}
    }}
  }}
}}"#,
                selected_addr
            ),
        )
        .expect("write hinted target runtime config");

        let loaded = load_config(Some(config_path.to_str().expect("config path str")))
            .expect("load hinted target runtime config");
        let app = SkeletonApplication::from_config(&loaded.effective);
        let response = app.handle(RequestEnvelope::new(
            "responses",
            r#"{
  "model": "gpt-5",
  "input": [
    { "type": "input_text", "text": "继续执行" },
    { "type": "input_image", "image_url": "file://whiteboard.png" }
  ]
}"#,
        ));

        selected_handle.join().expect("hinted target runtime join");

        let request = observed_request
            .lock()
            .expect("observed hinted request read")
            .clone();

        assert_eq!(response.provider_runtime, "transport-runtime");
        assert_eq!(response.status, "completed");
        assert_eq!(response.payload, "anthropic-selected-runtime");
        assert_eq!(
            response.route.selected_target.as_deref(),
            Some("beta.vision.gpt-4o")
        );
        assert!(request.starts_with("POST /v1/messages HTTP/1.1\r\n"));
        assert!(request.contains("\"messages\""));
        assert!(!request.contains("\"input\""));
    }

    #[test]
    fn canonical_responses_path_projects_audit_sidecar_only_into_provider_metadata() {
        let observed = Arc::new(Mutex::new(None));
        let app = SkeletonApplication::with_router_provider_and_target_hints(
            RouterBlock::default(),
            InspectingProviderRuntime::new(observed.clone()),
            std::collections::BTreeMap::new(),
            Some("anthropic".to_string()),
        );

        let response = app.handle(RequestEnvelope::new(
            "responses",
            r#"{
  "model":"claude-sonnet-4-5",
  "metadata":{"trace_id":"phase9"},
  "tool_choice":"required",
  "reasoning":{"effort":"medium"},
  "input":"查询股价"
}"#,
        ));

        let observed_request = observed
            .lock()
            .expect("observed request lock")
            .clone()
            .expect("provider request observed");

        assert_eq!(response.provider_runtime, "inspect-runtime");
        assert_eq!(response.status, "completed");
        assert_eq!(observed_request.metadata["trace_id"], json!("phase9"));
        assert_eq!(
            observed_request.metadata["protocol_mapping_audit"]["preserved"][0]["field"],
            json!("tool_choice")
        );
        assert_eq!(
            observed_request.metadata["protocol_mapping_audit"]["lossy"][0]["field"],
            json!("reasoning")
        );
        assert_eq!(
            observed_request.body["metadata"]["trace_id"],
            json!("phase9")
        );
        assert!(!observed_request
            .body
            .to_string()
            .contains("protocol_mapping_audit"));
    }

    #[test]
    fn canonical_responses_path_projects_gemini_request_shape_through_compat() {
        let observed = Arc::new(Mutex::new(None));
        let app = SkeletonApplication::with_router_provider_and_target_hints(
            RouterBlock::default(),
            InspectingProviderRuntime::new(observed.clone()),
            BTreeMap::new(),
            Some("gemini".to_string()),
        );

        let response = app.handle(RequestEnvelope::new(
            "responses",
            r#"{
  "model":"gemini-2.5-pro",
  "metadata":{"trace_id":"phase8"},
  "tool_choice":"required",
  "reasoning":{"effort":"medium"},
  "input":[
    {"type":"message","role":"developer","content":[{"type":"input_text","text":"只回答 JSON"}]},
    {"type":"message","role":"user","content":[{"type":"input_text","text":"查询股价"}]}
  ],
  "tools":[
    {
      "type":"function",
      "function":{
        "name":"lookup_price",
        "description":"查询股价",
        "parameters":{"type":"object","properties":{"ticker":{"type":"string"}}}
      }
    }
  ]
}"#,
        ));

        let observed_request = observed
            .lock()
            .expect("observed request lock")
            .clone()
            .expect("provider request observed");

        assert_eq!(response.provider_runtime, "inspect-runtime");
        assert_eq!(response.status, "completed");
        assert_eq!(
            observed_request.operation,
            rcc_core_domain::GEMINI_CHAT_OPERATION
        );
        assert_eq!(
            observed_request.body["systemInstruction"]["role"],
            json!("system")
        );
        assert_eq!(
            observed_request.body["systemInstruction"]["parts"][0]["text"],
            json!("只回答 JSON")
        );
        assert_eq!(observed_request.body["contents"][0]["role"], json!("user"));
        assert_eq!(
            observed_request.body["contents"][0]["parts"][0]["text"],
            json!("查询股价")
        );
        assert_eq!(
            observed_request.body["tools"][0]["functionDeclarations"][0]["name"],
            json!("lookup_price")
        );
        assert!(observed_request.body.get("metadata").is_none());
        assert_eq!(observed_request.metadata["trace_id"], json!("phase8"));
        assert_eq!(
            observed_request.metadata["protocol_mapping_audit"]["preserved"][0]["target_protocol"],
            json!("gemini-chat")
        );
        assert!(!observed_request
            .body
            .to_string()
            .contains("protocol_mapping_audit"));
    }

    #[test]
    fn from_config_projects_legacy_anthropic_provider_to_canonical_transport_request() {
        let observed_request = Arc::new(Mutex::new(String::new()));
        let observed_request_for_thread = observed_request.clone();
        let listener = TcpListener::bind("127.0.0.1:0").expect("bind legacy anthropic server");
        let addr = listener.local_addr().expect("legacy anthropic addr");
        let handle = thread::spawn(move || {
            let (mut stream, _) = listener.accept().expect("accept legacy anthropic");
            stream
                .set_read_timeout(Some(Duration::from_millis(1_500)))
                .expect("set legacy anthropic timeout");
            let request_bytes = drain_http_request(&mut stream);
            *observed_request_for_thread
                .lock()
                .expect("observed legacy anthropic request lock") =
                String::from_utf8_lossy(&request_bytes).into_owned();

            let body = "{\"text\":\"legacy-anthropic-hit\"}";
            let response = format!(
                "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\n\r\n{body}",
                body.len()
            );
            let _ = stream.write_all(response.as_bytes());
            let _ = stream.flush();
            let _ = stream.shutdown(Shutdown::Both);
        });

        let config_path = unique_test_path("legacy-anthropic-provider-config.json");
        std::fs::create_dir_all(config_path.parent().expect("config parent"))
            .expect("create config parent");
        std::fs::write(
            &config_path,
            format!(
                r#"{{
  "virtualrouter": {{
    "providers": {{
      "anthropic": {{
        "enabled": true,
        "type": "anthropic",
        "baseURL": "http://{}",
        "auth": {{
          "type": "apikey",
          "apiKey": "sk-anthropic"
        }}
      }}
    }},
    "routing": {{
      "default": [
        {{
          "targets": ["anthropic.claude-sonnet-4-5"]
        }}
      ]
    }}
  }}
}}"#,
                addr
            ),
        )
        .expect("write legacy anthropic config");

        let loaded = load_config(Some(config_path.to_str().expect("config path str")))
            .expect("load legacy anthropic config");
        let app = SkeletonApplication::from_config(&loaded.effective);
        let response = app.handle(RequestEnvelope::new(
            "responses",
            r#"{"model":"claude-sonnet-4-5","input":"继续执行"}"#,
        ));

        handle.join().expect("legacy anthropic join");

        let request = observed_request
            .lock()
            .expect("observed legacy anthropic request read")
            .clone();

        assert_eq!(response.provider_runtime, "transport-runtime");
        assert_eq!(response.status, "completed");
        assert_eq!(response.payload, "legacy-anthropic-hit");
        assert_eq!(
            response.route.selected_target.as_deref(),
            Some("anthropic.claude-sonnet-4-5")
        );
        assert!(request.starts_with("POST /v1/messages HTTP/1.1\r\n"));
        assert!(request.contains("x-api-key: sk-anthropic"));
        assert!(request.contains("anthropic-version: 2023-06-01"));
        assert!(request.contains("\"messages\""));
        assert!(!request.contains("\"input\""));
    }

    #[test]
    fn from_config_projects_legacy_anthropic_submit_tool_outputs_falls_back_to_canonical_messages()
    {
        let observed_request = Arc::new(Mutex::new(String::new()));
        let observed_request_for_thread = observed_request.clone();
        let listener =
            TcpListener::bind("127.0.0.1:0").expect("bind legacy anthropic submit server");
        let addr = listener.local_addr().expect("legacy anthropic submit addr");
        let handle = thread::spawn(move || {
            let (mut stream, _) = listener.accept().expect("accept legacy anthropic submit");
            stream
                .set_read_timeout(Some(Duration::from_millis(1_500)))
                .expect("set legacy anthropic submit timeout");
            let request_bytes = drain_http_request(&mut stream);
            *observed_request_for_thread
                .lock()
                .expect("observed legacy anthropic submit request lock") =
                String::from_utf8_lossy(&request_bytes).into_owned();

            let body = "{\"text\":\"legacy-anthropic-submit-hit\"}";
            let response = format!(
                "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\n\r\n{body}",
                body.len()
            );
            let _ = stream.write_all(response.as_bytes());
            let _ = stream.flush();
            let _ = stream.shutdown(Shutdown::Both);
        });

        let config_path = unique_test_path("legacy-anthropic-submit-provider-config.json");
        std::fs::create_dir_all(config_path.parent().expect("config parent"))
            .expect("create config parent");
        std::fs::write(
            &config_path,
            format!(
                r#"{{
  "virtualrouter": {{
    "providers": {{
      "anthropic": {{
        "enabled": true,
        "type": "anthropic",
        "baseURL": "http://{}",
        "auth": {{
          "type": "apikey",
          "apiKey": "sk-anthropic"
        }}
      }}
    }},
    "routing": {{
      "default": [
        {{
          "targets": ["anthropic.claude-sonnet-4-5"]
        }}
      ]
    }}
  }}
}}"#,
                addr
            ),
        )
        .expect("write legacy anthropic submit config");

        let loaded = load_config(Some(config_path.to_str().expect("config path str")))
            .expect("load legacy anthropic submit config");
        let app = SkeletonApplication::from_config(&loaded.effective);
        let response = app.handle(RequestEnvelope::new(
            "responses",
            r#"{
  "model":"claude-sonnet-4-5",
  "response_id":"resp-submit-1",
  "input":[
    {"type":"message","role":"assistant","content":[
      {"type":"function_call","call_id":"call_lookup_price","name":"lookup_price","arguments":"{\"ticker\":\"AAPL\"}"}
    ]}
  ],
  "tool_outputs":[
    {"tool_call_id":"call_lookup_price","output":"AAPL: 189.10"}
  ]
}"#,
        ));

        handle.join().expect("legacy anthropic submit join");

        let request = observed_request
            .lock()
            .expect("observed legacy anthropic submit request read")
            .clone();

        assert_eq!(response.provider_runtime, "transport-runtime");
        assert_eq!(response.status, "completed");
        assert_eq!(response.payload, "legacy-anthropic-submit-hit");
        assert!(request.starts_with("POST /v1/messages HTTP/1.1\r\n"));
        assert!(request.contains("\"type\":\"tool_use\""));
        assert!(request.contains("\"id\":\"call_lookup_price\""));
        assert!(request.contains("\"type\":\"tool_result\""));
        assert!(request.contains("\"tool_use_id\":\"call_lookup_price\""));
        assert!(request.contains("\"content\":\"AAPL: 189.10\""));
        assert!(!request.contains("\"response_id\":\"resp-submit-1\""));
        assert!(!request.contains("\"tool_outputs\""));
    }

    #[test]
    fn from_config_projects_legacy_anthropic_restores_submit_tool_outputs_by_response_id_only() {
        let observed_requests = Arc::new(Mutex::new(Vec::<String>::new()));
        let observed_requests_for_thread = observed_requests.clone();
        let listener = TcpListener::bind("127.0.0.1:0")
            .expect("bind legacy anthropic response-id restore server");
        let addr = listener
            .local_addr()
            .expect("legacy anthropic response-id restore addr");
        let handle = thread::spawn(move || {
            for idx in 0..2 {
                let (mut stream, _) = listener.accept().expect("accept restore request");
                stream
                    .set_read_timeout(Some(Duration::from_millis(1_500)))
                    .expect("set restore timeout");
                let request_bytes = drain_http_request(&mut stream);
                observed_requests_for_thread
                    .lock()
                    .expect("observed restore requests lock")
                    .push(String::from_utf8_lossy(&request_bytes).into_owned());

                let body = if idx == 0 {
                    r#"{"id":"msg_restore_1","type":"message","role":"assistant","content":[{"type":"text","text":"我来查询股价"},{"type":"tool_use","id":"call_lookup_price","name":"lookup_price","input":{"ticker":"AAPL"}}],"stop_reason":"tool_use"}"#
                } else {
                    r#"{"text":"legacy-anthropic-restored-hit"}"#
                };
                let response = format!(
                    "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\n\r\n{body}",
                    body.len()
                );
                let _ = stream.write_all(response.as_bytes());
                let _ = stream.flush();
                let _ = stream.shutdown(Shutdown::Both);
            }
        });

        let config_path = unique_test_path("legacy-anthropic-responseid-restore-config.json");
        std::fs::create_dir_all(config_path.parent().expect("config parent"))
            .expect("create config parent");
        std::fs::write(
            &config_path,
            format!(
                r#"{{
  "virtualrouter": {{
    "providers": {{
      "anthropic": {{
        "enabled": true,
        "type": "anthropic",
        "baseURL": "http://{}",
        "auth": {{
          "type": "apikey",
          "apiKey": "sk-anthropic"
        }}
      }}
    }},
    "routing": {{
      "default": [
        {{
          "targets": ["anthropic.claude-sonnet-4-5"]
        }}
      ]
    }}
  }}
}}"#,
                addr
            ),
        )
        .expect("write legacy anthropic response-id restore config");

        let loaded = load_config(Some(config_path.to_str().expect("config path str")))
            .expect("load legacy anthropic response-id restore config");
        let app = SkeletonApplication::from_config(&loaded.effective);

        let create_response = app.handle(RequestEnvelope::new(
            "responses",
            r#"{"model":"claude-sonnet-4-5","input":"查询股价"}"#,
        ));
        assert_eq!(create_response.status, "requires_action");
        assert_eq!(create_response.payload, "我来查询股价");
        assert_eq!(
            create_response.required_action["submit_tool_outputs"]["tool_calls"][0]["tool_call_id"],
            "call_lookup_price"
        );
        assert_eq!(
            create_response.raw_provider_response["body"]["id"],
            "msg_restore_1"
        );

        let submit_response = app.handle(RequestEnvelope::new(
            "responses",
            r#"{
  "model":"claude-sonnet-4-5",
  "response_id":"msg_restore_1",
  "tool_outputs":[
    {"tool_call_id":"call_lookup_price","output":"AAPL: 189.10"}
  ]
}"#,
        ));

        handle
            .join()
            .expect("legacy anthropic response-id restore join");

        let requests = observed_requests
            .lock()
            .expect("observed restore requests read")
            .clone();

        assert_eq!(submit_response.provider_runtime, "transport-runtime");
        assert_eq!(submit_response.status, "completed");
        assert_eq!(submit_response.payload, "legacy-anthropic-restored-hit");
        assert_eq!(requests.len(), 2);
        assert!(requests[0].contains("\"messages\""));
        assert!(requests[0].contains("\"text\":\"查询股价\""));
        assert!(requests[1].contains("\"type\":\"tool_use\""));
        assert!(requests[1].contains("\"id\":\"call_lookup_price\""));
        assert!(requests[1].contains("\"type\":\"tool_result\""));
        assert!(requests[1].contains("\"tool_use_id\":\"call_lookup_price\""));
        assert!(requests[1].contains("\"content\":\"AAPL: 189.10\""));
        assert!(!requests[1].contains("\"response_id\":\"msg_restore_1\""));
    }

    #[test]
    fn from_config_returns_explicit_provider_failure_when_selected_target_missing() {
        let config_path = unique_test_path("missing-target-runtime-registry-config.json");
        std::fs::create_dir_all(config_path.parent().expect("config parent"))
            .expect("create config parent");
        std::fs::write(
            &config_path,
            r#"{
  "provider": {
    "runtime": {
      "kind": "transport",
      "transport": {
        "base_url": "http://127.0.0.1:9"
      },
      "registry": {
        "transports": {
          "alpha.gpt-5": {
            "base_url": "http://127.0.0.1:9",
            "endpoint": "/v1/responses",
            "timeout_ms": 30000,
            "auth": {
              "type": "apikey",
              "api_key": ""
            }
          }
        }
      }
    }
  },
  "router": {
    "bootstrap": {
      "routes": {
        "multimodal": [
          {
            "targets": ["beta.vision.gpt-4o"],
            "priority": 10,
            "id": "multimodal-primary"
          }
        ]
      }
    }
  }
}"#,
        )
        .expect("write missing target runtime registry config");

        let loaded = load_config(Some(config_path.to_str().expect("config path str")))
            .expect("load missing target runtime registry config");
        let app = SkeletonApplication::from_config(&loaded.effective);
        let response = app.handle(RequestEnvelope::new(
            "responses",
            r#"{
  "input": [
    { "type": "input_text", "text": "继续执行" },
    { "type": "input_image", "image_url": "file://whiteboard.png" }
  ]
}"#,
        ));

        assert_eq!(response.status, "failed");
        assert_eq!(
            response.raw_provider_response["body"]["error"]["code"],
            "PROVIDER_TARGET_NOT_CONFIGURED"
        );
        assert_eq!(
            response.raw_provider_response["body"]["error"]["selected_target"],
            "beta.vision.gpt-4o"
        );
    }

    #[test]
    fn batch03_config_router_bootstrap_feeds_router_candidates() {
        let config_path = unique_test_path("batch03-router-bootstrap.json");
        std::fs::create_dir_all(config_path.parent().expect("config parent"))
            .expect("create config parent");
        std::fs::write(
            &config_path,
            r#"{
  "virtualrouter": {
    "activeRoutingPolicyGroup": "default",
    "routingPolicyGroups": {
      "default": {
        "routing": {
          "default": [
            {
              "id": "default-primary",
              "targets": ["openai.primary.gpt-5"]
            }
          ],
          "multimodal": [
            {
              "targets": ["openai.vision.gpt-4o"]
            }
          ]
        }
      }
    }
  }
}"#,
        )
        .expect("write batch03 config");

        let loaded = load_config(Some(config_path.to_str().expect("config path str")))
            .expect("load batch03 config");
        let routing = super::routing_pools_from_bootstrap(&loaded.effective.router.bootstrap);

        let candidates = build_route_candidates(&RouteCandidateInput {
            requested_route: "default".to_string(),
            classification_candidates: vec!["multimodal".to_string()],
            features: RouteFeatures {
                has_image_attachment: true,
                ..RouteFeatures::default()
            },
            routing,
        });

        assert_eq!(
            candidates,
            vec!["multimodal".to_string(), "default".to_string()]
        );
    }

    fn unique_test_path(name: &str) -> std::path::PathBuf {
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .expect("clock")
            .as_nanos();
        std::env::temp_dir().join(format!("rcc-core-orchestrator-{nanos}-{name}"))
    }

    fn load_config_value_for_route_handoff() -> rcc_core_config::RouterBootstrapConfig {
        let config_path = unique_test_path("route-handoff-router-bootstrap.json");
        std::fs::create_dir_all(config_path.parent().expect("config parent"))
            .expect("create config parent");
        std::fs::write(
            &config_path,
            r#"{
  "virtualrouter": {
    "routing": {
      "default": [
        {
          "id": "default-primary",
          "targets": ["openai.primary.gpt-5"]
        }
      ],
      "multimodal": [
        {
          "targets": ["openai.vision.gpt-4o"]
        }
      ]
    }
  }
}"#,
        )
        .expect("write route handoff config");

        let loaded = load_config(Some(config_path.to_str().expect("config path str")))
            .expect("load route handoff config");
        loaded.effective.router.bootstrap
    }

    #[derive(Clone)]
    struct InspectingProviderRuntime {
        observed_request: Arc<Mutex<Option<ProviderRequestCarrier>>>,
    }

    impl InspectingProviderRuntime {
        fn new(observed_request: Arc<Mutex<Option<ProviderRequestCarrier>>>) -> Self {
            Self { observed_request }
        }
    }

    impl ProviderRuntime for InspectingProviderRuntime {
        fn runtime_name(&self) -> &'static str {
            "inspect-runtime"
        }

        fn execute(&self, request: &ProviderRequestCarrier) -> ProviderResponseCarrier {
            *self.observed_request.lock().expect("observed request lock") = Some(request.clone());
            ProviderResponseCarrier {
                runtime: self.runtime_name().to_string(),
                status: "completed".to_string(),
                body: json!({
                    "text": "inspect-runtime"
                }),
                headers: json!({}),
                raw_stream_carrier: serde_json::Value::Null,
            }
        }
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
