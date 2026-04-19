use rcc_core_compat::CompatBlock;
use rcc_core_domain::RequestEnvelope;
use rcc_core_domain::{extract_output_text, ProviderRuntime};
use rcc_core_orchestrator::SkeletonApplication;
use rcc_core_pipeline::PipelineBlock;
use rcc_core_provider::{
    build_transport_request_plan, execute_sse_transport_request, execute_transport_request,
    extract_client_request_id, extract_entry_endpoint, extract_provider_runtime_metadata,
    preprocess_provider_request, NoopProviderRuntime, TransportProviderRuntime,
};
use rcc_core_router::{
    ForcedInstructionTarget, ModelCapability, ProviderRegistryView, ProviderRuntimeView,
    RouteCandidateInput, RouteFeatures, RoutePoolTier, RouterBlock, RoutingInstructionState,
    RoutingPools,
};
use serde_json::json;
use serde_json::Value;
use std::fs;
use std::io::{Read, Write};
use std::net::{Shutdown, TcpListener};
use std::path::{Path, PathBuf};
use std::thread;
use std::time::Duration;

pub fn run_workspace_smoke() -> String {
    let app = SkeletonApplication::new();
    let response = app.run_smoke(RequestEnvelope::new("tool.clock", "phase2-smoke"));
    format!(
        "runtime={} route={} tools={}",
        response.provider_runtime,
        response.route.target_block,
        response.tool_plan.scheduled.join(",")
    )
}

pub fn run_servertool_followup_smoke() -> String {
    let app = SkeletonApplication::new();
    let payload = r#"{"captured":{"model":"gpt-5","messages":[]},"followup_text":"继续执行"}"#;
    let response = app.run_smoke(RequestEnvelope::new("tool.followup", payload));
    format!(
        "runtime={} route={} tools={}",
        response.provider_runtime,
        response.route.target_block,
        response.tool_plan.scheduled.join(",")
    )
}

pub fn run_servertool_followup_injection_smoke() -> String {
    let app = SkeletonApplication::new();
    let payload = r#"{"captured":{"model":"gpt-5","messages":[]},"chat_response":{"choices":[{"message":{"role":"assistant","content":"done"}}],"tool_outputs":[{"tool_call_id":"call-1","content":{"ok":true}}]},"append_assistant_message":true,"append_tool_messages_from_tool_outputs":true,"followup_text":"继续执行"}"#;
    let response = app.run_smoke(RequestEnvelope::new("tool.followup", payload));
    format!(
        "runtime={} route={} tools={}",
        response.provider_runtime,
        response.route.target_block,
        response.tool_plan.scheduled.join(",")
    )
}

pub fn run_servertool_followup_system_vision_smoke() -> String {
    let app = SkeletonApplication::new();
    let payload = r#"{"captured":{"model":"gpt-5","messages":[{"role":"user","content":[{"type":"input_image","image_url":"file://board.png"}]}]},"inject_system_text":{"text":"继续使用 stopless 模式"},"inject_vision_summary":{"summary":"图中是一块白板"},"followup_text":"继续执行"}"#;
    let response = app.run_smoke(RequestEnvelope::new("tool.followup", payload));
    format!(
        "runtime={} route={} tools={}",
        response.provider_runtime,
        response.route.target_block,
        response.tool_plan.scheduled.join(",")
    )
}

pub fn run_servertool_followup_tool_governance_smoke() -> String {
    let app = SkeletonApplication::new();
    let payload = r#"{"captured":{"model":"gpt-5","messages":[],"tools":[{"type":"function","function":{"name":"lookup"}}],"parameters":{"parallel_tool_calls":true}},"ensure_standard_tools":true,"force_tool_choice":{"value":{"type":"function","function":{"name":"lookup"}}},"append_tool_if_missing":{"tool_name":"extra.tool","tool_definition":{"type":"function","function":{"name":"extra.tool"}}},"inject_system_text":{"text":"继续使用 stopless 模式"},"followup_text":"继续执行"}"#;
    let response = app.run_smoke(RequestEnvelope::new("tool.followup", payload));
    format!(
        "runtime={} route={} tools={}",
        response.provider_runtime,
        response.route.target_block,
        response.tool_plan.scheduled.join(",")
    )
}

pub fn run_servertool_stop_gateway_smoke() -> String {
    let app = SkeletonApplication::new();
    let payload =
        r#"{"base_response":{"choices":[{"finish_reason":"stop","message":{"content":"done"}}]}}"#;
    let response = app.run_smoke(RequestEnvelope::new("tool.stop.gateway", payload));
    format!(
        "runtime={} route={} tools={}",
        response.provider_runtime,
        response.route.target_block,
        response.tool_plan.scheduled.join(",")
    )
}

pub fn run_servertool_reasoning_stop_smoke() -> String {
    let app = SkeletonApplication::new();
    let payload = r#"{"tool_call":{"id":"call_1","name":"reasoning.stop","arguments":"{\"task_goal\":\"完成 batch06\",\"is_completed\":false,\"next_step\":\"补测试\"}"}}"#;
    let response = app.run_smoke(RequestEnvelope::new("tool.reasoning.stop", payload));
    format!(
        "runtime={} route={} tools={}",
        response.provider_runtime,
        response.route.target_block,
        response.tool_plan.scheduled.join(",")
    )
}

pub fn run_servertool_reasoning_stop_arm_smoke() -> String {
    let app = SkeletonApplication::new();
    let payload =
        r#"{"summary":"用户任务目标: 完成 batch07\n是否完成: 否\n下一步: 补测试","updated_at":1}"#;
    let response = app.run_smoke(RequestEnvelope::new("tool.reasoning.stop.arm", payload));
    format!(
        "runtime={} route={} tools={}",
        response.provider_runtime,
        response.route.target_block,
        response.tool_plan.scheduled.join(",")
    )
}

pub fn run_servertool_reasoning_stop_read_smoke() -> String {
    let app = SkeletonApplication::new();
    let payload = r#"{"state":{"reasoningStopArmed":true,"reasoningStopSummary":"用户任务目标: 完成 batch08","reasoningStopUpdatedAt":1}}"#;
    let response = app.run_smoke(RequestEnvelope::new("tool.reasoning.stop.read", payload));
    format!(
        "runtime={} route={} tools={}",
        response.provider_runtime,
        response.route.target_block,
        response.tool_plan.scheduled.join(",")
    )
}

pub fn run_servertool_reasoning_stop_clear_smoke() -> String {
    let app = SkeletonApplication::new();
    let payload = r#"{"state":{"reasoningStopArmed":true,"reasoningStopSummary":"用户任务目标: 完成 batch08","native":true}}"#;
    let response = app.run_smoke(RequestEnvelope::new("tool.reasoning.stop.clear", payload));
    format!(
        "runtime={} route={} tools={}",
        response.provider_runtime,
        response.route.target_block,
        response.tool_plan.scheduled.join(",")
    )
}

pub fn run_servertool_reasoning_stop_mode_sync_smoke() -> String {
    let app = SkeletonApplication::new();
    let payload = r#"{"captured":{"messages":[{"role":"user","content":"继续处理 <**stopless:endless**>"}]},"base_state":{"native":true},"fallback_mode":"off"}"#;
    let response = app.run_smoke(RequestEnvelope::new(
        "tool.reasoning.stop.mode.sync",
        payload,
    ));
    format!(
        "runtime={} route={} tools={}",
        response.provider_runtime,
        response.route.target_block,
        response.tool_plan.scheduled.join(",")
    )
}

pub fn run_servertool_reasoning_stop_sticky_save_smoke() -> String {
    let app = SkeletonApplication::new();
    let payload = r#"{"sticky_key":"session:smoke","session_dir":"/tmp/rcc-core-batch10-smoke","state":null}"#;
    let response = app.run_smoke(RequestEnvelope::new(
        "tool.reasoning.stop.sticky.save",
        payload,
    ));
    format!(
        "runtime={} route={} tools={}",
        response.provider_runtime,
        response.route.target_block,
        response.tool_plan.scheduled.join(",")
    )
}

pub fn run_servertool_reasoning_stop_sticky_load_smoke() -> String {
    let app = SkeletonApplication::new();
    let payload = r#"{"sticky_key":"session:smoke","session_dir":"/tmp/rcc-core-batch10-smoke"}"#;
    let response = app.run_smoke(RequestEnvelope::new(
        "tool.reasoning.stop.sticky.load",
        payload,
    ));
    format!(
        "runtime={} route={} tools={}",
        response.provider_runtime,
        response.route.target_block,
        response.tool_plan.scheduled.join(",")
    )
}

pub fn run_provider_transport_request_plan_smoke() -> String {
    let result = build_transport_request_plan(&json!({
        "provider": {
            "base_url": "https://api.example.com/v1/",
            "endpoint": "/chat/completions",
            "timeout_ms": 60000,
            "auth": {
                "type": "apikey",
                "api_key": "sk-smoke"
            }
        },
        "request_body": {
            "model": "gpt-5",
            "messages": []
        }
    }))
    .expect("provider plan");

    format!(
        "target_url={} auth={} timeout_ms={}",
        result["target_url"].as_str().unwrap_or(""),
        result["headers"]["Authorization"].as_str().unwrap_or(""),
        result["timeout_ms"].as_i64().unwrap_or_default()
    )
}

pub fn run_compat_batch02_smoke() -> String {
    let compat = CompatBlock::default();
    let provider = NoopProviderRuntime::default();
    let request = RequestEnvelope::new(
        "responses",
        r#"{"model":"gpt-5","input":"继续执行","metadata":{"trace_id":"phase8"}}"#,
    );

    let provider_request = compat.map_request(&request, None);
    let provider_response = provider.execute(&provider_request);
    let canonical = compat.map_response(&provider_response);

    format!(
        "operation={} model={} status={} raw_runtime={} output={}",
        provider_request.operation,
        provider_request.body["model"].as_str().unwrap_or(""),
        canonical.status,
        canonical.raw_carrier["runtime"].as_str().unwrap_or(""),
        extract_output_text(&canonical)
    )
}

pub fn run_responses_provider_execute_batch01_smoke() -> String {
    let listener =
        TcpListener::bind("127.0.0.1:0").expect("bind responses provider execute smoke server");
    let addr = listener
        .local_addr()
        .expect("responses provider execute smoke addr");
    let handle = thread::spawn(move || {
        let (mut stream, _) = listener
            .accept()
            .expect("accept responses provider execute smoke");
        stream
            .set_read_timeout(Some(Duration::from_millis(1_500)))
            .expect("set responses provider execute timeout");
        let _ = drain_http_request(&mut stream);
        let body = "{\"text\":\"responses-mainline-real-execute\"}";
        let response = format!(
            "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\n\r\n{body}",
            body.len()
        );
        let _ = stream.write_all(response.as_bytes());
        let _ = stream.flush();
        let _ = stream.shutdown(Shutdown::Both);
    });

    let app = SkeletonApplication::with_provider_runtime(TransportProviderRuntime::new(json!({
        "base_url": format!("http://{}", addr),
        "endpoint": "/v1/responses",
        "auth": {
            "type": "apikey",
            "api_key": ""
        }
    })));
    let response = app.run_smoke(RequestEnvelope::new(
        "responses",
        r#"{"model":"gpt-5","input":"继续执行"}"#,
    ));

    handle.join().expect("responses provider execute join");

    format!(
        "runtime={} route={} status={} payload={}",
        response.provider_runtime, response.route.target_block, response.status, response.payload
    )
}

pub fn run_provider_http_execute_smoke() -> String {
    let listener = TcpListener::bind("127.0.0.1:0").expect("bind provider smoke server");
    let addr = listener.local_addr().expect("provider smoke addr");
    let handle = thread::spawn(move || {
        let (mut stream, _) = listener.accept().expect("accept provider smoke");
        stream
            .set_read_timeout(Some(Duration::from_millis(1_500)))
            .expect("set provider smoke timeout");
        let _ = drain_http_request(&mut stream);
        let body = "{\"id\":\"resp_smoke\",\"ok\":true}";
        let response = format!(
            "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\n\r\n{body}",
            body.len()
        );
        let _ = stream.write_all(response.as_bytes());
        let _ = stream.flush();
        let _ = stream.shutdown(Shutdown::Both);
    });

    let result = execute_transport_request(&json!({
        "request_plan": {
            "method": "POST",
            "target_url": format!("http://{}/chat/completions", addr),
            "headers": {
                "Content-Type": "application/json"
            },
            "body": {
                "model": "gpt-5"
            },
            "timeout_ms": 1000
        },
        "retry": {
            "max_attempts": 1
        }
    }))
    .expect("provider execute");

    handle.join().expect("provider smoke join");

    format!(
        "status={} attempts={} ok={}",
        result["status"].as_i64().unwrap_or_default(),
        result["attempts"].as_i64().unwrap_or_default(),
        result["body"]["ok"].as_bool().unwrap_or(false)
    )
}

pub fn run_provider_runtime_metadata_smoke() -> String {
    let processed = preprocess_provider_request(&json!({
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
                    "x-client": "codex"
                }
            }
        }
    }))
    .expect("provider runtime metadata preprocess");
    let extracted = extract_provider_runtime_metadata(&processed).expect("runtime metadata");
    let entry = extract_entry_endpoint(&processed).expect("entry endpoint");
    let client_request_id = extract_client_request_id(&processed).expect("client request id");

    format!(
        "provider_key={} entry_endpoint={} client_request_id={}",
        extracted["runtime_metadata"]["providerKey"]
            .as_str()
            .unwrap_or(""),
        entry["entry_endpoint"].as_str().unwrap_or(""),
        client_request_id["client_request_id"]
            .as_str()
            .unwrap_or("")
    )
}

pub fn run_provider_sse_transport_smoke() -> String {
    let listener = TcpListener::bind("127.0.0.1:0").expect("bind provider sse smoke server");
    let addr = listener.local_addr().expect("provider sse smoke addr");
    let handle = thread::spawn(move || {
        let (mut stream, _) = listener.accept().expect("accept provider sse smoke");
        stream
            .set_read_timeout(Some(Duration::from_millis(1_500)))
            .expect("set provider sse smoke timeout");
        let _ = drain_http_request(&mut stream);
        let body = "event: message\ndata: {\"ok\":true}\n\n";
        let response = format!(
            "HTTP/1.1 200 OK\r\nContent-Type: text/event-stream\r\nContent-Length: {}\r\n\r\n{body}",
            body.len()
        );
        let _ = stream.write_all(response.as_bytes());
        let _ = stream.flush();
        let _ = stream.shutdown(Shutdown::Both);
    });

    let result = execute_sse_transport_request(&json!({
        "request": {
            "stream": true
        },
        "request_plan": {
            "method": "POST",
            "target_url": format!("http://{}/v1/responses", addr),
            "headers": {
                "Content-Type": "application/json"
            },
            "body": {
                "model": "gpt-5",
                "input": "hello"
            },
            "timeout_ms": 1000
        }
    }))
    .expect("provider sse execute");

    handle.join().expect("provider sse smoke join");

    format!(
        "content_type={} attempts={} ok={}",
        result["__sse_responses"]["content_type"]
            .as_str()
            .unwrap_or(""),
        result["attempts"].as_i64().unwrap_or_default(),
        result["ok"].as_bool().unwrap_or(false)
    )
}

pub fn run_router_batch01_smoke() -> String {
    let block = RouterBlock::default();
    let routing = RoutingPools::from([
        (
            "default".to_string(),
            vec![RoutePoolTier::new(
                "default.primary",
                vec!["openai.primary.gpt-5", "anthropic.ops.claude-3"],
                100,
            )],
        ),
        (
            "multimodal".to_string(),
            vec![RoutePoolTier::new(
                "multimodal.primary",
                vec!["openai.vision.gpt-4o"],
                100,
            )],
        ),
    ]);
    let candidates = block.build_route_candidates(&RouteCandidateInput {
        requested_route: "default".to_string(),
        classification_candidates: vec![],
        features: RouteFeatures {
            has_image_attachment: true,
            ..RouteFeatures::default()
        },
        routing: routing.clone(),
    });
    let mut state = RoutingInstructionState::default();
    state.allowed_providers.insert("openai".to_string());
    let filtered = block.filter_candidates_by_routing_state(
        &candidates,
        &state,
        &routing,
        &ProviderRegistryView::from_runtimes(vec![
            ProviderRuntimeView::new("openai.primary.gpt-5", "openai")
                .with_alias("primary")
                .with_runtime_index(1)
                .with_model_id("gpt-5"),
            ProviderRuntimeView::new("openai.vision.gpt-4o", "openai")
                .with_alias("vision")
                .with_runtime_index(2)
                .with_model_id("gpt-4o"),
            ProviderRuntimeView::new("anthropic.ops.claude-3", "anthropic")
                .with_alias("ops")
                .with_runtime_index(1)
                .with_model_id("claude-3"),
        ]),
    );
    let target = block
        .resolve_instruction_target(
            &ForcedInstructionTarget {
                provider: "openai".to_string(),
                model: Some("gpt-5".to_string()),
                key_alias: Some("primary".to_string()),
                key_index: None,
                path_length: 3,
            },
            &ProviderRegistryView::from_runtimes(vec![
                ProviderRuntimeView::new("openai.primary.gpt-5", "openai")
                    .with_alias("primary")
                    .with_runtime_index(1)
                    .with_model_id("gpt-5"),
                ProviderRuntimeView::new("openai.vision.gpt-4o", "openai")
                    .with_alias("vision")
                    .with_runtime_index(2)
                    .with_model_id("gpt-4o"),
            ]),
        )
        .expect("router target");

    format!(
        "candidates={} filtered={} target_mode={:?} target_key={}",
        candidates.join(","),
        filtered.join(","),
        target.mode,
        target.keys.first().cloned().unwrap_or_default()
    )
}

pub fn run_router_batch02_smoke() -> String {
    let block = RouterBlock::default();
    let routing = RoutingPools::from([
        (
            "default".to_string(),
            vec![RoutePoolTier::new(
                "default.primary",
                vec!["openai.primary.gpt-5", "anthropic.ops.claude-3"],
                100,
            )],
        ),
        (
            "multimodal".to_string(),
            vec![RoutePoolTier::new(
                "multimodal.primary",
                vec!["openai.vision.gpt-4o"],
                100,
            )],
        ),
        (
            "thinking".to_string(),
            vec![RoutePoolTier::new(
                "thinking.primary",
                vec!["openai.primary.gpt-5"],
                100,
            )],
        ),
        (
            "web_search".to_string(),
            vec![RoutePoolTier::new(
                "websearch.primary",
                vec!["anthropic.ops.claude-3"],
                100,
            )],
        ),
    ]);
    let provider_registry = ProviderRegistryView::from_runtimes(vec![
        ProviderRuntimeView::new("openai.primary.gpt-5", "openai")
            .with_alias("primary")
            .with_runtime_index(1)
            .with_model_id("gpt-5")
            .with_model_capabilities([ModelCapability::Thinking]),
        ProviderRuntimeView::new("openai.vision.gpt-4o", "openai")
            .with_alias("vision")
            .with_runtime_index(2)
            .with_model_id("gpt-4o")
            .with_model_capabilities([ModelCapability::Multimodal]),
        ProviderRuntimeView::new("anthropic.ops.claude-3", "anthropic")
            .with_alias("ops")
            .with_runtime_index(1)
            .with_model_id("claude-3")
            .with_model_capabilities([ModelCapability::WebSearch]),
    ]);
    let reordered_for_capability = block.reorder_for_capability(
        &[
            "default".to_string(),
            "web_search".to_string(),
            "thinking".to_string(),
        ],
        &ModelCapability::Thinking,
        &routing,
        &provider_registry,
    );
    let reordered_for_model = block.reorder_for_preferred_model(
        &["default".to_string(), "multimodal".to_string()],
        "gpt-4o",
        &routing,
        &provider_registry,
    );

    format!(
        "capability={} preferred_model={}",
        reordered_for_capability.join(","),
        reordered_for_model.join(",")
    )
}

pub fn run_pipeline_batch01_smoke() -> String {
    let block = PipelineBlock::default();
    let inbound = block.inbound(RequestEnvelope::new(
        "responses",
        r#"{"model":"gpt-5","input":"继续执行"}"#,
    ));
    let chat_process = block.chat_process(&inbound);
    let outbound = block.outbound(&chat_process);

    format!(
        "inbound={} chat_process={} outbound={}",
        inbound.operation, chat_process.operation, outbound.operation
    )
}

pub fn run_phase9_batch05_matrix_smoke() -> String {
    let pipeline = PipelineBlock::default();
    let compat = CompatBlock::default();

    let create_request = pipeline
        .inbound_canonical(RequestEnvelope::new(
            "responses",
            r#"{
              "model":"claude-sonnet-4-5",
              "input":"查询股价",
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
        ))
        .expect("phase9 batch05 create inbound");
    let create_state = pipeline
        .chat_process_canonical(
            create_request,
            rcc_core_domain::ResponsesContinuationContext {
                entry_endpoint: "/v1/responses",
                inbound_provider_id: Some("anthropic"),
                outbound_provider_id: Some("anthropic"),
                provider_supports_native: false,
                response_id: None,
                previous_response_id: None,
            },
        )
        .expect("phase9 batch05 create chat process");
    let create_outbound = pipeline.outbound_canonical(create_state, Some("anthropic"));
    let create_provider_request = compat
        .map_canonical_request(&create_outbound, None)
        .expect("phase9 batch05 create provider request");

    let provider_response = rcc_core_domain::ProviderResponseCarrier {
        runtime: "transport-runtime".to_string(),
        status: "completed".to_string(),
        body: json!({
            "id": "msg_matrix_1",
            "type": "message",
            "role": "assistant",
            "content": [
                {"type": "text", "text": "我来查询股价"},
                {"type": "tool_use", "id": "call_lookup_price", "name": "lookup_price", "input": {"ticker": "AAPL"}}
            ],
            "stop_reason": "tool_use"
        }),
        headers: json!({}),
        raw_stream_carrier: serde_json::Value::Null,
    };
    let canonical_response = compat.map_response(&provider_response);
    let store_record = json!({
        "id": canonical_response.response_id,
        "status": canonical_response.status,
        "output": canonical_response.output,
        "required_action": canonical_response.required_action,
    });
    pipeline
        .remember_responses_conversation(&create_outbound.request, &store_record)
        .expect("phase9 batch05 remember conversation");

    let submit_request = pipeline
        .inbound_canonical(RequestEnvelope::new(
            "responses",
            r#"{
              "model":"claude-sonnet-4-5",
              "response_id":"msg_matrix_1",
              "tool_outputs":[
                {"tool_call_id":"call_lookup_price","output":"AAPL: 189.10"}
              ]
            }"#,
        ))
        .expect("phase9 batch05 submit inbound");
    let submit_state = pipeline
        .chat_process_canonical(
            submit_request,
            rcc_core_domain::ResponsesContinuationContext {
                entry_endpoint: "/v1/responses.submit_tool_outputs",
                inbound_provider_id: Some("anthropic"),
                outbound_provider_id: Some("anthropic"),
                provider_supports_native: false,
                response_id: Some("msg_matrix_1"),
                previous_response_id: None,
            },
        )
        .expect("phase9 batch05 submit restore");
    let submit_outbound = pipeline.outbound_canonical(submit_state, Some("anthropic"));
    let submit_provider_request = compat
        .map_canonical_request(&submit_outbound, None)
        .expect("phase9 batch05 submit provider request");
    let submit_tool_use_id = submit_provider_request.body["messages"]
        .as_array()
        .and_then(|messages| {
            messages.iter().find_map(|message| {
                message
                    .get("content")
                    .and_then(|content| content.as_array())
                    .and_then(|blocks| {
                        blocks.iter().find_map(|block| {
                            block
                                .get("type")
                                .and_then(|value| value.as_str())
                                .is_some_and(|kind| kind == "tool_use")
                                .then(|| block.get("id").and_then(|value| value.as_str()))
                                .flatten()
                        })
                    })
            })
        })
        .unwrap_or("");
    let submit_tool_result_id = submit_provider_request.body["messages"]
        .as_array()
        .and_then(|messages| {
            messages.iter().find_map(|message| {
                message
                    .get("content")
                    .and_then(|content| content.as_array())
                    .and_then(|blocks| {
                        blocks.iter().find_map(|block| {
                            block
                                .get("type")
                                .and_then(|value| value.as_str())
                                .is_some_and(|kind| kind == "tool_result")
                                .then(|| block.get("tool_use_id").and_then(|value| value.as_str()))
                                .flatten()
                        })
                    })
            })
        })
        .unwrap_or("");

    format!(
        "create_text={} create_tool={} response_id={} required_call={} submit_tool_use={} submit_tool_result={}",
        create_provider_request.body["messages"][0]["content"][0]["text"]
            .as_str()
            .unwrap_or(""),
        create_provider_request.body["tools"][0]["name"]
            .as_str()
            .unwrap_or(""),
        canonical_response.response_id.as_deref().unwrap_or(""),
        canonical_response.required_action["submit_tool_outputs"]["tool_calls"][0]["tool_call_id"]
            .as_str()
            .unwrap_or(""),
        submit_tool_use_id,
        submit_tool_result_id,
    )
}

pub fn run_phase9_batch06_audit_matrix_smoke() -> String {
    let anthropic = rcc_core_domain::build_responses_cross_protocol_audit(
        &json!({
            "prompt_cache_key": "cache-key-101",
            "response_format": {"type":"json_object"},
            "parallel_tool_calls": true,
            "service_tier": "default",
            "truncation": "disabled",
            "include": ["output_text"],
            "store": true,
            "reasoning": {"effort":"medium"},
            "tool_choice": "required"
        }),
        rcc_core_domain::TARGET_PROTOCOL_ANTHROPIC,
    );
    let gemini = rcc_core_domain::build_responses_cross_protocol_audit(
        &json!({
            "prompt_cache_key": "cache-key-202",
            "response_format": {"type":"json_schema"},
            "parallel_tool_calls": true,
            "service_tier": "default",
            "truncation": "disabled",
            "include": ["output_text"],
            "store": true,
            "reasoning": {"effort":"high"},
            "tool_choice": "required"
        }),
        rcc_core_domain::TARGET_PROTOCOL_GEMINI,
    );

    format!(
        "anthropic_dropped={} anthropic_unsupported={} anthropic_lossy={} anthropic_preserved_reason={} gemini_dropped={} gemini_unsupported={} gemini_lossy={} gemini_preserved_reason={}",
        anthropic.dropped.len(),
        anthropic.unsupported.len(),
        anthropic.lossy.len(),
        anthropic.preserved.first().map(|entry| entry.reason.as_str()).unwrap_or(""),
        gemini.dropped.len(),
        gemini.unsupported.len(),
        gemini.lossy.len(),
        gemini.preserved.first().map(|entry| entry.reason.as_str()).unwrap_or(""),
    )
}

pub fn run_phase9_batch07_audit_sidecar_smoke() -> String {
    let compat = CompatBlock::default();
    let request = rcc_core_domain::lift_responses_request_to_canonical(RequestEnvelope::new(
        "responses",
        r#"{
          "model":"claude-sonnet-4-5",
          "metadata":{"trace_id":"phase9"},
          "tool_choice":"required",
          "reasoning":{"effort":"medium"},
          "input":"查询股价"
        }"#,
    ))
    .expect("phase9 batch07 canonical request");
    let audit = rcc_core_domain::build_responses_cross_protocol_audit(
        &serde_json::from_str::<serde_json::Value>(&request.raw_payload_text)
            .expect("phase9 batch07 raw payload"),
        rcc_core_domain::TARGET_PROTOCOL_ANTHROPIC,
    );
    let outbound = rcc_core_domain::HubCanonicalOutboundRequest {
        request,
        target_provider_id: Some("anthropic".to_string()),
        continuation_owner: rcc_core_domain::ResponsesContinuationOwner::None,
        protocol_mapping_audit: Some(audit),
    };
    let carrier = compat
        .map_canonical_request(&outbound, None)
        .expect("phase9 batch07 carrier");
    let body_text = carrier.body.to_string();

    format!(
        "carrier_has_audit={} body_has_audit={} preserved_field={} lossy_field={}",
        carrier.metadata.get("protocol_mapping_audit").is_some(),
        body_text.contains("protocol_mapping_audit"),
        carrier.metadata["protocol_mapping_audit"]["preserved"][0]["field"]
            .as_str()
            .unwrap_or(""),
        carrier.metadata["protocol_mapping_audit"]["lossy"][0]["field"]
            .as_str()
            .unwrap_or(""),
    )
}

pub fn run_phase8_batch04_gemini_compat_smoke() -> String {
    let compat = CompatBlock::default();
    let request = rcc_core_domain::lift_responses_request_to_canonical(RequestEnvelope::new(
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
    ))
    .expect("phase8 batch04 canonical request");
    let audit = rcc_core_domain::build_responses_cross_protocol_audit(
        &serde_json::from_str::<serde_json::Value>(&request.raw_payload_text)
            .expect("phase8 batch04 raw payload"),
        rcc_core_domain::TARGET_PROTOCOL_GEMINI,
    );
    let outbound = rcc_core_domain::HubCanonicalOutboundRequest {
        request,
        target_provider_id: Some("gemini".to_string()),
        continuation_owner: rcc_core_domain::ResponsesContinuationOwner::None,
        protocol_mapping_audit: Some(audit),
    };
    let carrier = compat
        .map_canonical_request(&outbound, None)
        .expect("phase8 batch04 carrier");

    format!(
        "operation={} system_role={} user_role={} tool_name={} metadata_has_audit={} body_has_audit={}",
        carrier.operation,
        carrier.body["systemInstruction"]["role"].as_str().unwrap_or(""),
        carrier.body["contents"][0]["role"].as_str().unwrap_or(""),
        carrier.body["tools"][0]["functionDeclarations"][0]["name"]
            .as_str()
            .unwrap_or(""),
        carrier.metadata.get("protocol_mapping_audit").is_some(),
        carrier.body.to_string().contains("protocol_mapping_audit"),
    )
}

pub fn run_phase12_batch01_regression_smoke() -> String {
    let audit_summary = run_phase9_batch06_audit_matrix_smoke();
    let compat_summary = run_phase9_batch05_matrix_smoke();
    let request_chain = rcc_core_domain::resolve_continuation_sticky_key(
        &rcc_core_domain::ContinuationStickyContext {
            request_id: "req_chat_1",
            session_id: Some("session_should_lose"),
            conversation_id: None,
            response_id: None,
            previous_response_id: None,
            continuation_chain_id: Some("chain_request_root_1"),
            sticky_scope: Some(rcc_core_domain::ContinuationStickyScope::RequestChain),
        },
    )
    .unwrap_or_default();
    let session_key = rcc_core_domain::resolve_continuation_sticky_key(
        &rcc_core_domain::ContinuationStickyContext {
            request_id: "req_anthropic_1",
            session_id: Some("session_scope_1"),
            conversation_id: Some("conversation_should_lose"),
            response_id: None,
            previous_response_id: None,
            continuation_chain_id: None,
            sticky_scope: Some(rcc_core_domain::ContinuationStickyScope::Session),
        },
    )
    .unwrap_or_default();

    format!(
        "audit=[{audit_summary}] compat=[{compat_summary}] request_chain={request_chain} session_key={session_key}"
    )
}

pub fn run_phase12_batch02_protocol_matrix_smoke() -> String {
    let audit_summary = run_phase9_batch06_audit_matrix_smoke();
    let anthropic_compat = run_phase9_batch05_matrix_smoke();
    let gemini_compat = run_phase8_batch04_gemini_compat_smoke();
    let request_chain = rcc_core_domain::resolve_continuation_sticky_key(
        &rcc_core_domain::ContinuationStickyContext {
            request_id: "req_chat_1",
            session_id: Some("session_should_lose"),
            conversation_id: None,
            response_id: None,
            previous_response_id: None,
            continuation_chain_id: Some("chain_request_root_1"),
            sticky_scope: Some(rcc_core_domain::ContinuationStickyScope::RequestChain),
        },
    )
    .unwrap_or_default();
    let session_key = rcc_core_domain::resolve_continuation_sticky_key(
        &rcc_core_domain::ContinuationStickyContext {
            request_id: "req_anthropic_1",
            session_id: Some("session_scope_1"),
            conversation_id: Some("conversation_should_lose"),
            response_id: None,
            previous_response_id: None,
            continuation_chain_id: None,
            sticky_scope: Some(rcc_core_domain::ContinuationStickyScope::Session),
        },
    )
    .unwrap_or_default();

    format!(
        "audit=[{audit_summary}] anthropic=[{anthropic_compat}] gemini=[{gemini_compat}] request_chain={request_chain} session_key={session_key}"
    )
}

pub fn run_phase12_batch03_provider_compat_samples_smoke() -> String {
    let fixtures_root = repo_root().join("fixtures/mock-provider");
    let registry = read_json_file(&fixtures_root.join("_registry/index.json"));
    let registry_count = registry
        .get("samples")
        .and_then(Value::as_array)
        .map(|items| items.len())
        .unwrap_or_default();

    let submit_requests = load_sample_jsons(
        &fixtures_root.join("openai-responses.submit_tool_outputs"),
        "request.json",
    );
    let submit_has_apply_patch = submit_requests.iter().any(has_apply_patch_tool_output);

    let anthropic_requests =
        load_sample_jsons(&fixtures_root.join("anthropic-messages"), "request.json");
    let anthropic_responses =
        load_sample_jsons(&fixtures_root.join("anthropic-messages"), "response.json");
    let openai_chat_requests =
        load_sample_jsons(&fixtures_root.join("openai-chat"), "request.json");
    let openai_chat_responses =
        load_sample_jsons(&fixtures_root.join("openai-chat"), "response.json");

    let anthropic_exists = fixtures_root.join("anthropic-messages").exists();
    let openai_chat_exists = fixtures_root.join("openai-chat").exists();

    format!(
        "registry_count={} submit_requests={} apply_patch={} anthropic_exists={} anthropic_requests={} anthropic_responses={} openai_chat_exists={} openai_chat_requests={} openai_chat_responses={}",
        registry_count,
        submit_requests.len(),
        submit_has_apply_patch,
        anthropic_exists,
        anthropic_requests.len(),
        anthropic_responses.len(),
        openai_chat_exists,
        openai_chat_requests.len(),
        openai_chat_responses.len(),
    )
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

fn repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../..")
        .canonicalize()
        .expect("repo root")
}

fn read_json_file(path: &Path) -> Value {
    serde_json::from_str(
        &fs::read_to_string(path)
            .unwrap_or_else(|error| panic!("read {} failed: {error}", path.display())),
    )
    .unwrap_or_else(|error| panic!("parse {} failed: {error}", path.display()))
}

fn load_sample_jsons(root: &Path, target_name: &str) -> Vec<Value> {
    if !root.exists() {
        return Vec::new();
    }
    let mut values = Vec::new();
    walk_sample_dir(root, target_name, &mut values);
    values
}

fn walk_sample_dir(root: &Path, target_name: &str, values: &mut Vec<Value>) {
    let entries = fs::read_dir(root)
        .unwrap_or_else(|error| panic!("read_dir {} failed: {error}", root.display()));
    for entry in entries {
        let entry = entry
            .unwrap_or_else(|error| panic!("dir entry under {} failed: {error}", root.display()));
        let path = entry.path();
        if path.is_dir() {
            walk_sample_dir(&path, target_name, values);
        } else if path
            .file_name()
            .and_then(|name| name.to_str())
            .is_some_and(|name| name == target_name)
        {
            values.push(read_json_file(&path));
        }
    }
}

fn has_apply_patch_tool_output(value: &Value) -> bool {
    value
        .get("body")
        .and_then(|body| body.get("tool_outputs"))
        .and_then(Value::as_array)
        .map(|items| {
            items.iter().any(|item| {
                item.get("tool_call_id")
                    .and_then(Value::as_str)
                    .is_some_and(|tool_call_id| tool_call_id.starts_with("apply_patch:"))
            })
        })
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::{
        run_compat_batch02_smoke, run_phase12_batch01_regression_smoke,
        run_phase12_batch02_protocol_matrix_smoke,
        run_phase12_batch03_provider_compat_samples_smoke, run_phase8_batch04_gemini_compat_smoke,
        run_phase9_batch05_matrix_smoke, run_phase9_batch06_audit_matrix_smoke,
        run_phase9_batch07_audit_sidecar_smoke, run_pipeline_batch01_smoke,
        run_provider_http_execute_smoke, run_provider_runtime_metadata_smoke,
        run_provider_sse_transport_smoke, run_provider_transport_request_plan_smoke,
        run_responses_provider_execute_batch01_smoke, run_router_batch01_smoke,
        run_router_batch02_smoke, run_servertool_followup_injection_smoke,
        run_servertool_followup_smoke, run_servertool_followup_system_vision_smoke,
        run_servertool_followup_tool_governance_smoke, run_servertool_reasoning_stop_arm_smoke,
        run_servertool_reasoning_stop_clear_smoke, run_servertool_reasoning_stop_mode_sync_smoke,
        run_servertool_reasoning_stop_read_smoke, run_servertool_reasoning_stop_smoke,
        run_servertool_reasoning_stop_sticky_load_smoke,
        run_servertool_reasoning_stop_sticky_save_smoke, run_servertool_stop_gateway_smoke,
        run_workspace_smoke,
    };

    #[test]
    fn workspace_smoke_returns_expected_summary() {
        let summary = run_workspace_smoke();
        assert!(summary.contains("runtime=noop-runtime"));
        assert!(summary.contains("route=servertool"));
        assert!(summary.contains("servertool.followup"));
    }

    #[test]
    fn servertool_followup_smoke_builds_followup_plan() {
        let summary = run_servertool_followup_smoke();
        assert!(summary.contains("runtime=noop-runtime"));
        assert!(summary.contains("route=servertool"));
        assert!(summary.contains("servertool.followup.request"));
    }

    #[test]
    fn servertool_followup_injection_smoke_builds_followup_plan() {
        let summary = run_servertool_followup_injection_smoke();
        assert!(summary.contains("runtime=noop-runtime"));
        assert!(summary.contains("route=servertool"));
        assert!(summary.contains("servertool.followup.request"));
    }

    #[test]
    fn servertool_followup_system_vision_smoke_builds_followup_plan() {
        let summary = run_servertool_followup_system_vision_smoke();
        assert!(summary.contains("runtime=noop-runtime"));
        assert!(summary.contains("route=servertool"));
        assert!(summary.contains("servertool.followup.request"));
    }

    #[test]
    fn servertool_followup_tool_governance_smoke_builds_followup_plan() {
        let summary = run_servertool_followup_tool_governance_smoke();
        assert!(summary.contains("runtime=noop-runtime"));
        assert!(summary.contains("route=servertool"));
        assert!(summary.contains("servertool.followup.request"));
    }

    #[test]
    fn servertool_stop_gateway_smoke_builds_stop_gateway_plan() {
        let summary = run_servertool_stop_gateway_smoke();
        assert!(summary.contains("runtime=noop-runtime"));
        assert!(summary.contains("route=servertool"));
        assert!(summary.contains("servertool.stop.gateway.eligible"));
    }

    #[test]
    fn servertool_reasoning_stop_smoke_builds_reasoning_stop_plan() {
        let summary = run_servertool_reasoning_stop_smoke();
        assert!(summary.contains("runtime=noop-runtime"));
        assert!(summary.contains("route=servertool"));
        assert!(summary.contains("servertool.reasoning.stop.valid"));
    }

    #[test]
    fn servertool_reasoning_stop_arm_smoke_builds_state_patch_plan() {
        let summary = run_servertool_reasoning_stop_arm_smoke();
        assert!(summary.contains("runtime=noop-runtime"));
        assert!(summary.contains("route=servertool"));
        assert!(summary.contains("servertool.reasoning.stop.arm.valid"));
    }

    #[test]
    fn servertool_reasoning_stop_read_smoke_builds_state_view_plan() {
        let summary = run_servertool_reasoning_stop_read_smoke();
        assert!(summary.contains("runtime=noop-runtime"));
        assert!(summary.contains("route=servertool"));
        assert!(summary.contains("servertool.reasoning.stop.read.valid"));
    }

    #[test]
    fn servertool_reasoning_stop_clear_smoke_builds_clear_plan() {
        let summary = run_servertool_reasoning_stop_clear_smoke();
        assert!(summary.contains("runtime=noop-runtime"));
        assert!(summary.contains("route=servertool"));
        assert!(summary.contains("servertool.reasoning.stop.clear.valid"));
    }

    #[test]
    fn provider_transport_request_plan_smoke_builds_canonical_plan() {
        let summary = run_provider_transport_request_plan_smoke();
        assert!(summary.contains("target_url=https://api.example.com/v1/chat/completions"));
        assert!(summary.contains("auth=Bearer sk-smoke"));
        assert!(summary.contains("timeout_ms=60000"));
    }

    #[test]
    fn provider_http_execute_smoke_runs_minimal_execute_path() {
        let summary = run_provider_http_execute_smoke();
        assert!(summary.contains("status=200"));
        assert!(summary.contains("attempts=1"));
        assert!(summary.contains("ok=true"));
    }

    #[test]
    fn provider_runtime_metadata_smoke_runs_minimal_attach_read_path() {
        let summary = run_provider_runtime_metadata_smoke();
        assert!(summary.contains("provider_key=openai"));
        assert!(summary.contains("entry_endpoint=/v1/responses"));
        assert!(summary.contains("client_request_id=client-1"));
    }

    #[test]
    fn provider_sse_transport_smoke_runs_minimal_stream_boundary() {
        let summary = run_provider_sse_transport_smoke();
        assert!(summary.contains("content_type=text/event-stream"));
        assert!(summary.contains("attempts=1"));
        assert!(summary.contains("ok=true"));
    }

    #[test]
    fn servertool_reasoning_stop_mode_sync_smoke_builds_mode_sync_plan() {
        let summary = run_servertool_reasoning_stop_mode_sync_smoke();
        assert!(summary.contains("runtime=noop-runtime"));
        assert!(summary.contains("route=servertool"));
        assert!(summary.contains("servertool.reasoning.stop.mode.sync.valid"));
    }

    #[test]
    fn servertool_reasoning_stop_sticky_save_smoke_builds_save_plan() {
        let summary = run_servertool_reasoning_stop_sticky_save_smoke();
        assert!(summary.contains("runtime=noop-runtime"));
        assert!(summary.contains("route=servertool"));
        assert!(summary.contains("servertool.reasoning.stop.sticky.save.valid"));
    }

    #[test]
    fn servertool_reasoning_stop_sticky_load_smoke_builds_load_plan() {
        let summary = run_servertool_reasoning_stop_sticky_load_smoke();
        assert!(summary.contains("runtime=noop-runtime"));
        assert!(summary.contains("route=servertool"));
        assert!(summary.contains("servertool.reasoning.stop.sticky.load.valid"));
    }

    #[test]
    fn router_batch01_smoke_runs_minimal_router_block_path() {
        let summary = run_router_batch01_smoke();
        assert!(summary.contains("candidates=multimodal,default"));
        assert!(summary.contains("filtered=multimodal,default"));
        assert!(summary.contains("target_mode=Exact"));
        assert!(summary.contains("target_key=openai.primary.gpt-5"));
    }

    #[test]
    fn router_batch02_smoke_runs_capability_and_model_reorder_path() {
        let summary = run_router_batch02_smoke();
        assert!(summary.contains("capability=default,thinking,web_search"));
        assert!(summary.contains("preferred_model=multimodal,default"));
    }

    #[test]
    fn pipeline_batch01_smoke_runs_inbound_chat_outbound_skeleton() {
        let summary = run_pipeline_batch01_smoke();
        assert!(summary.contains("inbound=responses"));
        assert!(summary.contains("chat_process=responses"));
        assert!(summary.contains("outbound=responses"));
    }

    #[test]
    fn compat_batch02_smoke_runs_pipeline_to_provider_mapping_path() {
        let summary = run_compat_batch02_smoke();
        assert!(summary.contains("operation=responses"));
        assert!(summary.contains("model=gpt-5"));
        assert!(summary.contains("status=completed"));
        assert!(summary.contains("raw_runtime=noop-runtime"));
        assert!(summary.contains("operation=responses"));
    }

    #[test]
    fn responses_provider_execute_batch01_smoke_runs_real_transport_mainline() {
        let summary = run_responses_provider_execute_batch01_smoke();
        assert!(summary.contains("runtime=transport-runtime"));
        assert!(summary.contains("route=pipeline"));
        assert!(summary.contains("status=completed"));
        assert!(summary.contains("payload=responses-mainline-real-execute"));
    }

    #[test]
    fn phase9_batch05_matrix_smoke_runs_minimal_roundtrip_restore_chain() {
        let summary = run_phase9_batch05_matrix_smoke();
        assert!(summary.contains("create_text=查询股价"));
        assert!(summary.contains("create_tool=lookup_price"));
        assert!(summary.contains("response_id=msg_matrix_1"));
        assert!(summary.contains("required_call=call_lookup_price"));
        assert!(summary.contains("submit_tool_use=call_lookup_price"));
        assert!(summary.contains("submit_tool_result=call_lookup_price"));
    }

    #[test]
    fn phase9_batch06_audit_matrix_smoke_runs_minimal_cross_protocol_audit() {
        let summary = run_phase9_batch06_audit_matrix_smoke();
        assert!(summary.contains("anthropic_dropped=6"));
        assert!(summary.contains("anthropic_unsupported=1"));
        assert!(summary.contains("anthropic_lossy=1"));
        assert!(summary.contains("anthropic_preserved_reason=preserved_verbatim_top_level"));
        assert!(summary.contains("gemini_dropped=6"));
        assert!(summary.contains("gemini_unsupported=1"));
        assert!(summary.contains("gemini_lossy=1"));
        assert!(summary.contains("gemini_preserved_reason=preserved_via_metadata_passthrough"));
    }

    #[test]
    fn phase9_batch07_audit_sidecar_smoke_projects_metadata_without_touching_body() {
        let summary = run_phase9_batch07_audit_sidecar_smoke();
        assert!(summary.contains("carrier_has_audit=true"));
        assert!(summary.contains("body_has_audit=false"));
        assert!(summary.contains("preserved_field=tool_choice"));
        assert!(summary.contains("lossy_field=reasoning"));
    }

    #[test]
    fn phase8_batch04_gemini_compat_smoke_projects_minimal_request_shape() {
        let summary = run_phase8_batch04_gemini_compat_smoke();
        assert!(summary.contains("operation=gemini-chat"));
        assert!(summary.contains("system_role=system"));
        assert!(summary.contains("user_role=user"));
        assert!(summary.contains("tool_name=lookup_price"));
        assert!(summary.contains("metadata_has_audit=true"));
        assert!(summary.contains("body_has_audit=false"));
    }

    #[test]
    fn phase12_batch01_regression_smoke_covers_audit_compat_and_continuation() {
        let summary = run_phase12_batch01_regression_smoke();
        assert!(summary.contains("anthropic_dropped=6"));
        assert!(summary.contains("gemini_dropped=6"));
        assert!(summary.contains("create_tool=lookup_price"));
        assert!(summary.contains("submit_tool_result=call_lookup_price"));
        assert!(summary.contains("request_chain=chain_request_root_1"));
        assert!(summary.contains("session_key=session:session_scope_1"));
    }

    #[test]
    fn phase12_batch02_protocol_matrix_smoke_covers_doc_truth() {
        let summary = run_phase12_batch02_protocol_matrix_smoke();
        assert!(summary.contains("anthropic_unsupported=1"));
        assert!(summary.contains("gemini_unsupported=1"));
        assert!(summary.contains("anthropic_lossy=1"));
        assert!(summary.contains("gemini_lossy=1"));
        assert!(summary.contains("create_text=查询股价"));
        assert!(summary.contains("submit_tool_result=call_lookup_price"));
        assert!(summary.contains("operation=gemini-chat"));
        assert!(summary.contains("tool_name=lookup_price"));
        assert!(summary.contains("request_chain=chain_request_root_1"));
        assert!(summary.contains("session_key=session:session_scope_1"));
    }

    #[test]
    fn phase12_batch03_provider_compat_samples_smoke_reads_local_fixtures() {
        let summary = run_phase12_batch03_provider_compat_samples_smoke();
        assert!(summary.contains("registry_count=3"));
        assert!(summary.contains("submit_requests=1"));
        assert!(summary.contains("apply_patch=true"));
        assert!(summary.contains("anthropic_exists=true"));
        assert!(summary.contains("anthropic_requests=1"));
        assert!(summary.contains("anthropic_responses=1"));
        assert!(summary.contains("openai_chat_exists=true"));
        assert!(summary.contains("openai_chat_requests=1"));
        assert!(summary.contains("openai_chat_responses=1"));
    }
}
