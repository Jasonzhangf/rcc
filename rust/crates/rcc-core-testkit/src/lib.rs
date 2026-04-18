use rcc_core_domain::RequestEnvelope;
use rcc_core_orchestrator::SkeletonApplication;
use rcc_core_provider::{
    build_transport_request_plan, execute_sse_transport_request, execute_transport_request,
    extract_client_request_id, extract_entry_endpoint, extract_provider_runtime_metadata,
    preprocess_provider_request,
};
use rcc_core_router::{
    ForcedInstructionTarget, ProviderRegistryView, ProviderRuntimeView, RouteCandidateInput,
    RouteFeatures, RoutePoolTier, RouterBlock, RoutingInstructionState, RoutingPools,
};
use serde_json::json;
use std::io::{Read, Write};
use std::net::{Shutdown, TcpListener};
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

pub fn run_provider_http_execute_smoke() -> String {
    let listener = TcpListener::bind("127.0.0.1:0").expect("bind provider smoke server");
    let addr = listener.local_addr().expect("provider smoke addr");
    let handle = thread::spawn(move || {
        let (mut stream, _) = listener.accept().expect("accept provider smoke");
        stream
            .set_read_timeout(Some(Duration::from_millis(500)))
            .expect("set provider smoke timeout");
        let mut buffer = [0_u8; 4096];
        let _ = stream.read(&mut buffer);
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
            "timeout_ms": 200
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
            .set_read_timeout(Some(Duration::from_millis(500)))
            .expect("set provider sse smoke timeout");
        let mut buffer = [0_u8; 4096];
        let _ = stream.read(&mut buffer);
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
            "timeout_ms": 200
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

#[cfg(test)]
mod tests {
    use super::{
        run_provider_http_execute_smoke, run_provider_runtime_metadata_smoke,
        run_provider_sse_transport_smoke, run_provider_transport_request_plan_smoke,
        run_router_batch01_smoke, run_servertool_followup_injection_smoke,
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
}
