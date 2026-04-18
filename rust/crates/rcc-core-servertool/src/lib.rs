mod followup;
mod reasoning_stop;
mod stop_gateway;

use followup::build_followup_request as build_followup_request_inner;
use rcc_core_domain::{RequestEnvelope, ToolPlan};
use reasoning_stop::{
    build_clear_reasoning_stop_state_result as build_clear_reasoning_stop_state_result_inner,
    build_reasoning_stop_mode_sync_result as build_reasoning_stop_mode_sync_result_inner,
    build_reasoning_stop_state_patch as build_reasoning_stop_state_patch_inner,
    build_reasoning_stop_tool_output as build_reasoning_stop_tool_output_inner,
    increment_reasoning_stop_fail_count as increment_reasoning_stop_fail_count_inner,
    load_reasoning_stop_sticky_state as load_reasoning_stop_sticky_state_inner,
    read_reasoning_stop_fail_count as read_reasoning_stop_fail_count_inner,
    read_reasoning_stop_state_view as read_reasoning_stop_state_view_inner,
    reset_reasoning_stop_fail_count as reset_reasoning_stop_fail_count_inner,
    save_reasoning_stop_sticky_state as save_reasoning_stop_sticky_state_inner,
};
use serde_json::Value;
use stop_gateway::resolve_stop_gateway_context as resolve_stop_gateway_context_inner;

pub use followup::build_followup_request;
pub use reasoning_stop::build_clear_reasoning_stop_state_result;
pub use reasoning_stop::build_reasoning_stop_mode_sync_result;
pub use reasoning_stop::build_reasoning_stop_state_patch;
pub use reasoning_stop::build_reasoning_stop_tool_output;
pub use reasoning_stop::increment_reasoning_stop_fail_count;
pub use reasoning_stop::load_reasoning_stop_sticky_state;
pub use reasoning_stop::read_reasoning_stop_fail_count;
pub use reasoning_stop::read_reasoning_stop_state_view;
pub use reasoning_stop::reset_reasoning_stop_fail_count;
pub use reasoning_stop::save_reasoning_stop_sticky_state;
pub use stop_gateway::resolve_stop_gateway_context;

#[derive(Debug, Default)]
pub struct ServertoolBlock;

impl ServertoolBlock {
    pub fn build_followup_request(&self, payload: &Value) -> Option<Value> {
        build_followup_request_inner(payload)
    }

    pub fn resolve_stop_gateway_context(&self, payload: &Value) -> Option<Value> {
        resolve_stop_gateway_context_inner(payload)
    }

    pub fn build_reasoning_stop_tool_output(&self, payload: &Value) -> Option<Value> {
        build_reasoning_stop_tool_output_inner(payload)
    }

    pub fn build_reasoning_stop_state_patch(&self, payload: &Value) -> Option<Value> {
        build_reasoning_stop_state_patch_inner(payload)
    }

    pub fn read_reasoning_stop_state_view(&self, payload: &Value) -> Option<Value> {
        read_reasoning_stop_state_view_inner(payload)
    }

    pub fn build_clear_reasoning_stop_state_result(&self, payload: &Value) -> Option<Value> {
        build_clear_reasoning_stop_state_result_inner(payload)
    }

    pub fn build_reasoning_stop_mode_sync_result(&self, payload: &Value) -> Option<Value> {
        build_reasoning_stop_mode_sync_result_inner(payload)
    }

    pub fn read_reasoning_stop_fail_count(&self, payload: &Value) -> Option<Value> {
        read_reasoning_stop_fail_count_inner(payload)
    }

    pub fn increment_reasoning_stop_fail_count(&self, payload: &Value) -> Option<Value> {
        increment_reasoning_stop_fail_count_inner(payload)
    }

    pub fn reset_reasoning_stop_fail_count(&self, payload: &Value) -> Option<Value> {
        reset_reasoning_stop_fail_count_inner(payload)
    }

    pub fn save_reasoning_stop_sticky_state(&self, payload: &Value) -> Option<Value> {
        save_reasoning_stop_sticky_state_inner(payload)
    }

    pub fn load_reasoning_stop_sticky_state(&self, payload: &Value) -> Option<Value> {
        load_reasoning_stop_sticky_state_inner(payload)
    }

    pub fn plan(&self, request: &RequestEnvelope) -> ToolPlan {
        if request.operation.contains("tool.followup") {
            let scheduled = serde_json::from_str::<Value>(&request.payload)
                .ok()
                .and_then(|payload| self.build_followup_request(&payload))
                .map(|_| vec!["servertool.followup.request".to_string()])
                .unwrap_or_else(|| vec!["servertool.followup.invalid".to_string()]);
            return ToolPlan { scheduled };
        }

        if request.operation.contains("tool.stop.gateway") {
            let scheduled = serde_json::from_str::<Value>(&request.payload)
                .ok()
                .and_then(|payload| self.resolve_stop_gateway_context(&payload))
                .map(|context| vec![classify_stop_gateway_schedule(&context).to_string()])
                .unwrap_or_else(|| vec!["servertool.stop.gateway.invalid".to_string()]);
            return ToolPlan { scheduled };
        }

        if request.operation.contains("tool.reasoning.stop.read") {
            let scheduled = serde_json::from_str::<Value>(&request.payload)
                .ok()
                .and_then(|payload| self.read_reasoning_stop_state_view(&payload))
                .map(|_| vec!["servertool.reasoning.stop.read.valid".to_string()])
                .unwrap_or_else(|| vec!["servertool.reasoning.stop.read.invalid".to_string()]);
            return ToolPlan { scheduled };
        }

        if request.operation.contains("tool.reasoning.stop.fail.read") {
            let scheduled = serde_json::from_str::<Value>(&request.payload)
                .ok()
                .and_then(|payload| self.read_reasoning_stop_fail_count(&payload))
                .map(|_| vec!["servertool.reasoning.stop.fail.read.valid".to_string()])
                .unwrap_or_else(|| vec!["servertool.reasoning.stop.fail.read.invalid".to_string()]);
            return ToolPlan { scheduled };
        }

        if request.operation.contains("tool.reasoning.stop.fail.inc") {
            let scheduled = serde_json::from_str::<Value>(&request.payload)
                .ok()
                .and_then(|payload| self.increment_reasoning_stop_fail_count(&payload))
                .map(|_| vec!["servertool.reasoning.stop.fail.inc.valid".to_string()])
                .unwrap_or_else(|| vec!["servertool.reasoning.stop.fail.inc.invalid".to_string()]);
            return ToolPlan { scheduled };
        }

        if request.operation.contains("tool.reasoning.stop.fail.reset") {
            let scheduled = serde_json::from_str::<Value>(&request.payload)
                .ok()
                .and_then(|payload| self.reset_reasoning_stop_fail_count(&payload))
                .map(|_| vec!["servertool.reasoning.stop.fail.reset.valid".to_string()])
                .unwrap_or_else(
                    || vec!["servertool.reasoning.stop.fail.reset.invalid".to_string()],
                );
            return ToolPlan { scheduled };
        }

        if request
            .operation
            .contains("tool.reasoning.stop.sticky.save")
        {
            let scheduled = serde_json::from_str::<Value>(&request.payload)
                .ok()
                .and_then(|payload| self.save_reasoning_stop_sticky_state(&payload))
                .map(|_| vec!["servertool.reasoning.stop.sticky.save.valid".to_string()])
                .unwrap_or_else(|| {
                    vec!["servertool.reasoning.stop.sticky.save.invalid".to_string()]
                });
            return ToolPlan { scheduled };
        }

        if request
            .operation
            .contains("tool.reasoning.stop.sticky.load")
        {
            let scheduled = serde_json::from_str::<Value>(&request.payload)
                .ok()
                .and_then(|payload| self.load_reasoning_stop_sticky_state(&payload))
                .map(|_| vec!["servertool.reasoning.stop.sticky.load.valid".to_string()])
                .unwrap_or_else(|| {
                    vec!["servertool.reasoning.stop.sticky.load.invalid".to_string()]
                });
            return ToolPlan { scheduled };
        }

        if request.operation.contains("tool.reasoning.stop.mode.sync") {
            let scheduled = serde_json::from_str::<Value>(&request.payload)
                .ok()
                .and_then(|payload| self.build_reasoning_stop_mode_sync_result(&payload))
                .map(|_| vec!["servertool.reasoning.stop.mode.sync.valid".to_string()])
                .unwrap_or_else(|| vec!["servertool.reasoning.stop.mode.sync.invalid".to_string()]);
            return ToolPlan { scheduled };
        }

        if request.operation.contains("tool.reasoning.stop.clear") {
            let scheduled = serde_json::from_str::<Value>(&request.payload)
                .ok()
                .and_then(|payload| self.build_clear_reasoning_stop_state_result(&payload))
                .map(|_| vec!["servertool.reasoning.stop.clear.valid".to_string()])
                .unwrap_or_else(|| vec!["servertool.reasoning.stop.clear.invalid".to_string()]);
            return ToolPlan { scheduled };
        }

        if request.operation.contains("tool.reasoning.stop.arm") {
            let scheduled = serde_json::from_str::<Value>(&request.payload)
                .ok()
                .and_then(|payload| self.build_reasoning_stop_state_patch(&payload))
                .map(|_| vec!["servertool.reasoning.stop.arm.valid".to_string()])
                .unwrap_or_else(|| vec!["servertool.reasoning.stop.arm.invalid".to_string()]);
            return ToolPlan { scheduled };
        }

        if request.operation.contains("tool.reasoning.stop") {
            let scheduled = serde_json::from_str::<Value>(&request.payload)
                .ok()
                .and_then(|payload| self.build_reasoning_stop_tool_output(&payload))
                .map(|_| vec!["servertool.reasoning.stop.valid".to_string()])
                .unwrap_or_else(|| vec!["servertool.reasoning.stop.invalid".to_string()]);
            return ToolPlan { scheduled };
        }

        if request.operation.contains("clock") || request.operation.contains("tool") {
            return ToolPlan {
                scheduled: vec!["servertool.followup".to_string()],
            };
        }

        ToolPlan::empty()
    }
}

#[cfg(test)]
mod tests {
    use super::ServertoolBlock;
    use rcc_core_domain::RequestEnvelope;
    use serde_json::{json, Value};

    #[test]
    fn plan_marks_followup_request_when_payload_is_valid() {
        let block = ServertoolBlock::default();
        let request = RequestEnvelope::new(
            "tool.followup",
            r#"{"captured":{"model":"gpt-5","messages":[]},"followup_text":"继续执行"}"#,
        );

        let plan = block.plan(&request);
        assert_eq!(
            plan.scheduled,
            vec!["servertool.followup.request".to_string()]
        );
    }

    #[test]
    fn plan_accepts_followup_injection_payload() {
        let block = ServertoolBlock::default();
        let request = RequestEnvelope::new(
            "tool.followup",
            r#"{"captured":{"model":"gpt-5","messages":[]},"chat_response":{"choices":[{"message":{"role":"assistant","content":"done"}}]},"append_assistant_message":true,"followup_text":"继续执行"}"#,
        );

        let plan = block.plan(&request);
        assert_eq!(
            plan.scheduled,
            vec!["servertool.followup.request".to_string()]
        );
    }

    #[test]
    fn plan_accepts_followup_system_vision_payload() {
        let block = ServertoolBlock::default();
        let request = RequestEnvelope::new(
            "tool.followup",
            r#"{"captured":{"model":"gpt-5","messages":[{"role":"user","content":[{"type":"input_image","image_url":"file://a.png"}]}]},"inject_system_text":{"text":"继续使用 stopless 模式"},"inject_vision_summary":{"summary":"图中是一块白板"},"followup_text":"继续执行"}"#,
        );

        let plan = block.plan(&request);
        assert_eq!(
            plan.scheduled,
            vec!["servertool.followup.request".to_string()]
        );
    }

    #[test]
    fn plan_accepts_followup_tool_governance_payload() {
        let block = ServertoolBlock::default();
        let request = RequestEnvelope::new(
            "tool.followup",
            r#"{"captured":{"model":"gpt-5","messages":[],"tools":[{"type":"function","function":{"name":"lookup"}}],"parameters":{"parallel_tool_calls":true}},"ensure_standard_tools":true,"force_tool_choice":{"value":{"type":"function","function":{"name":"lookup"}}},"append_tool_if_missing":{"tool_name":"extra.tool","tool_definition":{"type":"function","function":{"name":"extra.tool"}}},"inject_system_text":{"text":"继续使用 stopless 模式"},"followup_text":"继续执行"}"#,
        );

        let plan = block.plan(&request);
        assert_eq!(
            plan.scheduled,
            vec!["servertool.followup.request".to_string()]
        );
    }

    #[test]
    fn plan_marks_followup_invalid_when_payload_cannot_build() {
        let block = ServertoolBlock::default();
        let request =
            RequestEnvelope::new("tool.followup", r#"{"captured":{},"followup_text":""}"#);

        let plan = block.plan(&request);
        assert_eq!(
            plan.scheduled,
            vec!["servertool.followup.invalid".to_string()]
        );
    }

    #[test]
    fn plan_marks_stop_gateway_eligible_when_context_is_eligible() {
        let block = ServertoolBlock::default();
        let request = RequestEnvelope::new(
            "tool.stop.gateway",
            r#"{"base_response":{"choices":[{"finish_reason":"stop","message":{"content":"done"}}]}}"#,
        );

        let plan = block.plan(&request);
        assert_eq!(
            plan.scheduled,
            vec!["servertool.stop.gateway.eligible".to_string()]
        );
    }

    #[test]
    fn plan_marks_stop_gateway_blocked_when_context_is_not_eligible() {
        let block = ServertoolBlock::default();
        let request = RequestEnvelope::new(
            "tool.stop.gateway",
            r#"{"base_response":{"choices":[{"finish_reason":"stop","message":{"content":"done","tool_calls":[{"id":"call-1"}]}}]}}"#,
        );

        let plan = block.plan(&request);
        assert_eq!(
            plan.scheduled,
            vec!["servertool.stop.gateway.blocked".to_string()]
        );
    }

    #[test]
    fn plan_marks_stop_gateway_invalid_when_payload_is_missing_or_malformed() {
        let block = ServertoolBlock::default();
        let missing = RequestEnvelope::new("tool.stop.gateway", r#"{"captured":{}}"#);
        let malformed =
            RequestEnvelope::new("tool.stop.gateway", r#"{"base_response":"bad payload"}"#);

        assert_eq!(
            block.plan(&missing).scheduled,
            vec!["servertool.stop.gateway.invalid".to_string()]
        );
        assert_eq!(
            block.plan(&malformed).scheduled,
            vec!["servertool.stop.gateway.invalid".to_string()]
        );
    }

    #[test]
    fn plan_marks_reasoning_stop_valid_when_tool_output_can_be_built() {
        let block = ServertoolBlock::default();
        let request = RequestEnvelope::new(
            "tool.reasoning.stop",
            r#"{"tool_call":{"id":"call_1","name":"reasoning.stop","arguments":"{\"task_goal\":\"完成 batch06\",\"is_completed\":false,\"next_step\":\"补测试\"}"}}"#,
        );

        let plan = block.plan(&request);
        assert_eq!(
            plan.scheduled,
            vec!["servertool.reasoning.stop.valid".to_string()]
        );
    }

    #[test]
    fn plan_keeps_reasoning_stop_semantic_errors_on_valid_route() {
        let block = ServertoolBlock::default();
        let request = RequestEnvelope::new(
            "tool.reasoning.stop",
            r#"{"tool_call":{"id":"call_1","name":"reasoning.stop","arguments":"{}"}}"#,
        );

        let plan = block.plan(&request);
        assert_eq!(
            plan.scheduled,
            vec!["servertool.reasoning.stop.valid".to_string()]
        );
    }

    #[test]
    fn plan_marks_reasoning_stop_invalid_when_payload_cannot_build_tool_output() {
        let block = ServertoolBlock::default();
        let request = RequestEnvelope::new("tool.reasoning.stop", r#"{"captured":{}}"#);

        let plan = block.plan(&request);
        assert_eq!(
            plan.scheduled,
            vec!["servertool.reasoning.stop.invalid".to_string()]
        );
    }

    #[test]
    fn build_reasoning_stop_tool_output_returns_error_tool_output_for_semantic_failures() {
        let block = ServertoolBlock::default();
        let payload = json!({
            "tool_call": {
                "id": "call_1",
                "name": "reasoning.stop",
                "arguments": "{}"
            }
        });

        let result = block
            .build_reasoning_stop_tool_output(&payload)
            .expect("tool output");
        let content =
            serde_json::from_str::<Value>(result["content"].as_str().expect("content string"))
                .expect("json");
        assert_eq!(content["ok"], json!(false));
        assert_eq!(content["code"], json!("TASK_GOAL_REQUIRED"));
    }

    #[test]
    fn plan_marks_reasoning_stop_arm_valid_when_patch_can_be_built() {
        let block = ServertoolBlock::default();
        let request = RequestEnvelope::new(
            "tool.reasoning.stop.arm",
            r#"{"summary":"用户任务目标: 完成 batch07\n是否完成: 否\n下一步: 补测试","updated_at":1}"#,
        );

        let plan = block.plan(&request);
        assert_eq!(
            plan.scheduled,
            vec!["servertool.reasoning.stop.arm.valid".to_string()]
        );
    }

    #[test]
    fn plan_marks_reasoning_stop_arm_invalid_when_patch_cannot_be_built() {
        let block = ServertoolBlock::default();
        let request = RequestEnvelope::new(
            "tool.reasoning.stop.arm",
            r#"{"tool_output":{"name":"reasoning.stop","content":"{\"ok\":false}"}}"#,
        );

        let plan = block.plan(&request);
        assert_eq!(
            plan.scheduled,
            vec!["servertool.reasoning.stop.arm.invalid".to_string()]
        );
    }

    #[test]
    fn plan_marks_reasoning_stop_read_valid_for_default_view() {
        let block = ServertoolBlock::default();
        let request = RequestEnvelope::new("tool.reasoning.stop.read", r#"{"state":{}}"#);

        let plan = block.plan(&request);
        assert_eq!(
            plan.scheduled,
            vec!["servertool.reasoning.stop.read.valid".to_string()]
        );
    }

    #[test]
    fn plan_marks_reasoning_stop_read_invalid_for_non_object_payload() {
        let block = ServertoolBlock::default();
        let request = RequestEnvelope::new("tool.reasoning.stop.read", r#""bad""#);

        let plan = block.plan(&request);
        assert_eq!(
            plan.scheduled,
            vec!["servertool.reasoning.stop.read.invalid".to_string()]
        );
    }

    #[test]
    fn plan_marks_reasoning_stop_fail_read_valid_when_count_can_be_read() {
        let block = ServertoolBlock::default();
        let request = RequestEnvelope::new(
            "tool.reasoning.stop.fail.read",
            r#"{"sticky_key":"session:demo","session_dir":"/tmp/rcc-core-batch11-plan"}"#,
        );

        let plan = block.plan(&request);
        assert_eq!(
            plan.scheduled,
            vec!["servertool.reasoning.stop.fail.read.valid".to_string()]
        );
    }

    #[test]
    fn plan_marks_reasoning_stop_fail_inc_valid_when_count_can_be_incremented() {
        let block = ServertoolBlock::default();
        let request = RequestEnvelope::new(
            "tool.reasoning.stop.fail.inc",
            r#"{"sticky_key":"session:demo","session_dir":"/tmp/rcc-core-batch11-plan"}"#,
        );

        let plan = block.plan(&request);
        assert_eq!(
            plan.scheduled,
            vec!["servertool.reasoning.stop.fail.inc.valid".to_string()]
        );
    }

    #[test]
    fn plan_marks_reasoning_stop_fail_reset_invalid_for_bad_key() {
        let block = ServertoolBlock::default();
        let request =
            RequestEnvelope::new("tool.reasoning.stop.fail.reset", r#"{"sticky_key":"bad"}"#);

        let plan = block.plan(&request);
        assert_eq!(
            plan.scheduled,
            vec!["servertool.reasoning.stop.fail.reset.invalid".to_string()]
        );
    }

    #[test]
    fn plan_marks_reasoning_stop_mode_sync_valid_when_result_can_be_built() {
        let block = ServertoolBlock::default();
        let request = RequestEnvelope::new(
            "tool.reasoning.stop.mode.sync",
            r#"{"captured":{"messages":[{"role":"user","content":"继续 <**stopless:endless**>"}]},"base_state":{"native":true}}"#,
        );

        let plan = block.plan(&request);
        assert_eq!(
            plan.scheduled,
            vec!["servertool.reasoning.stop.mode.sync.valid".to_string()]
        );
    }

    #[test]
    fn plan_marks_reasoning_stop_mode_sync_invalid_for_missing_captured() {
        let block = ServertoolBlock::default();
        let request = RequestEnvelope::new("tool.reasoning.stop.mode.sync", r#"{"base_state":{}}"#);

        let plan = block.plan(&request);
        assert_eq!(
            plan.scheduled,
            vec!["servertool.reasoning.stop.mode.sync.invalid".to_string()]
        );
    }

    #[test]
    fn plan_marks_reasoning_stop_sticky_save_valid_when_state_can_be_saved() {
        let block = ServertoolBlock::default();
        let request = RequestEnvelope::new(
            "tool.reasoning.stop.sticky.save",
            r#"{"sticky_key":"session:demo","session_dir":"/tmp/rcc-core-batch10-plan","state":null}"#,
        );

        let plan = block.plan(&request);
        assert_eq!(
            plan.scheduled,
            vec!["servertool.reasoning.stop.sticky.save.valid".to_string()]
        );
    }

    #[test]
    fn plan_marks_reasoning_stop_sticky_load_invalid_for_bad_key() {
        let block = ServertoolBlock::default();
        let request =
            RequestEnvelope::new("tool.reasoning.stop.sticky.load", r#"{"sticky_key":"bad"}"#);

        let plan = block.plan(&request);
        assert_eq!(
            plan.scheduled,
            vec!["servertool.reasoning.stop.sticky.load.invalid".to_string()]
        );
    }

    #[test]
    fn plan_marks_reasoning_stop_clear_valid_when_clear_result_exists() {
        let block = ServertoolBlock::default();
        let request = RequestEnvelope::new(
            "tool.reasoning.stop.clear",
            r#"{"state":{"reasoningStopArmed":true,"native":true}}"#,
        );

        let plan = block.plan(&request);
        assert_eq!(
            plan.scheduled,
            vec!["servertool.reasoning.stop.clear.valid".to_string()]
        );
    }

    #[test]
    fn plan_marks_reasoning_stop_clear_invalid_for_non_object_payload() {
        let block = ServertoolBlock::default();
        let request = RequestEnvelope::new("tool.reasoning.stop.clear", r#""bad""#);

        let plan = block.plan(&request);
        assert_eq!(
            plan.scheduled,
            vec!["servertool.reasoning.stop.clear.invalid".to_string()]
        );
    }
}

fn classify_stop_gateway_schedule(context: &Value) -> &'static str {
    let source = context
        .get("source")
        .and_then(Value::as_str)
        .unwrap_or("none");
    let reason = context.get("reason").and_then(Value::as_str).unwrap_or("");
    if source == "none" && reason == "invalid_payload" {
        return "servertool.stop.gateway.invalid";
    }

    if context
        .get("eligible")
        .and_then(Value::as_bool)
        .unwrap_or(false)
    {
        "servertool.stop.gateway.eligible"
    } else {
        "servertool.stop.gateway.blocked"
    }
}
