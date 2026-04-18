use rcc_core_domain::RequestEnvelope;
use rcc_core_orchestrator::SkeletonApplication;

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

#[cfg(test)]
mod tests {
    use super::{
        run_servertool_followup_injection_smoke, run_servertool_followup_smoke,
        run_servertool_followup_system_vision_smoke, run_servertool_followup_tool_governance_smoke,
        run_servertool_reasoning_stop_arm_smoke, run_servertool_reasoning_stop_clear_smoke,
        run_servertool_reasoning_stop_mode_sync_smoke, run_servertool_reasoning_stop_read_smoke,
        run_servertool_reasoning_stop_smoke, run_servertool_reasoning_stop_sticky_load_smoke,
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
}
