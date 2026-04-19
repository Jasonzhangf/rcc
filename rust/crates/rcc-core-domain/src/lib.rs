pub mod apply_patch_structured;
pub mod apply_patch_text;
pub mod args_json;
pub mod blocked_report;
pub mod compat_mapping;
pub mod compat_request_projection;
pub mod context_advisor;
pub mod context_weighted;
pub mod continuation_semantics;
pub mod continuation_sticky_key;
pub mod exec_command_normalize;
pub mod followup_message_trim;
pub mod followup_request_utils;
pub mod followup_sanitize;
pub mod followup_tool_compact;
pub mod health_weighted;
pub mod hub_canonical;
pub mod hub_mapping_ops;
pub mod hub_pipeline_skeleton;
pub mod marker_lifecycle;
pub mod mcp_resource_discovery;
pub mod message_content_text;
pub mod message_utils;
pub mod pre_command_directive;
pub mod pre_command_state;
pub mod pre_command_token;
pub mod provider_target_hint;
pub mod reasoning_markup;
pub mod responses_continuation_materialize;
pub mod responses_continuation_policy;
pub mod responses_conversation;
pub mod responses_ingress;
pub mod responses_protocol_mapping_audit;
pub mod router_selection_input;
pub mod routing_instruction_clean;
pub mod routing_instruction_preprocess;
pub mod routing_stop_message_codec;
pub mod stop_gateway;
pub mod stop_message_state;
pub mod tool_description;
pub mod tool_protocol_invariants;
pub mod tool_registry_guards;
pub mod tool_signals;

use serde_json::Value;

pub use apply_patch_structured::{
    coerce_structured_apply_patch_payload, is_structured_apply_patch_payload, try_parse_json,
};
pub use apply_patch_text::{is_apply_patch_payload_candidate, looks_like_patch};
pub use blocked_report::{
    extract_blocked_report_from_messages, extract_blocked_report_from_text,
    normalize_blocked_report, BlockedReport,
};
pub use compat_mapping::{
    build_canonical_response, build_provider_request_carrier,
    build_provider_request_carrier_from_canonical_outbound, extract_output_text,
    normalize_compat_canonical_request, normalize_compat_request_payload, CompatCanonicalRequest,
    CompatCanonicalResponse, CompatProjectionError, ProviderRequestCarrier,
    ProviderResponseCarrier, ANTHROPIC_MESSAGES_OPERATION, GEMINI_CHAT_OPERATION,
};
pub use context_advisor::{
    classify_context_pool, resolve_context_routing_config, ContextAdvisorResult,
    ContextRoutingConfigInput, ContextUsageSnapshot, ProviderContextLimit,
    ResolvedContextRoutingConfig, DEFAULT_MODEL_CONTEXT_TOKENS, DEFAULT_WARN_RATIO,
};
pub use context_weighted::{
    compute_context_multiplier, compute_effective_safe_window_tokens,
    resolve_context_weighted_config, ContextWeightedConfigInput, ResolvedContextWeightedConfig,
    DEFAULT_CONTEXT_WEIGHTED_CONFIG,
};
pub use continuation_semantics::{
    lift_request_continuation_semantics, project_response_continuation_semantics,
    project_responses_shell_continuation, take_responses_resume_state, ContinuationResumeFrom,
    ContinuationSemantics, ContinuationToolMode, ContinuationToolSemantics,
    RequestContinuationInput, RequestContinuationProjection, RequestContinuationToolOutput,
    ResponseContinuationInput, ResponsesResumeState, ResponsesResumeToolOutput,
    ResponsesShellContinuationProjection,
};
pub use continuation_sticky_key::{
    resolve_continuation_sticky_key, ContinuationStickyContext, ContinuationStickyScope,
};
pub use exec_command_normalize::{
    normalize_exec_command_args, ExecCommandNormalizeError, ExecCommandNormalizeOptions,
    ExecCommandNormalizeResult, ExecCommandSchemaMode,
};
pub use followup_message_trim::{trim_openai_messages_for_followup, FollowupTrimOptions};
pub use followup_request_utils::{
    drop_tool_by_function_name, extract_responses_top_level_parameters,
    normalize_followup_parameters, resolve_followup_model,
};
pub use followup_sanitize::{sanitize_followup_snapshot_text, sanitize_followup_text};
pub use followup_tool_compact::{compact_tool_content_in_messages, compact_tool_content_value};
pub use health_weighted::{
    compute_health_multiplier, compute_health_weight, resolve_health_weighted_config,
    HealthWeightResult, HealthWeightedConfigInput, ProviderQuotaViewEntryLite,
    ResolvedHealthWeightedConfig, DEFAULT_HEALTH_WEIGHTED_CONFIG,
};
pub use hub_canonical::{
    infer_responses_entry_endpoint, lift_request_envelope_to_canonical,
    lift_responses_request_to_canonical, HubCanonicalContentPart, HubCanonicalError,
    HubCanonicalMessage, HubCanonicalOutboundRequest, HubCanonicalRequest,
    HubCanonicalToolDefinition, HubCanonicalToolResult, HUB_SOURCE_PROTOCOL_RESPONSES,
};
pub use hub_mapping_ops::{
    project_json_fields, JsonFieldMappingRule, JsonMappingError, ProtocolAuditDisposition,
    ProtocolMappingAudit, ProtocolMappingAuditEntry,
};
pub use hub_pipeline_skeleton::{
    build_hub_chat_process_request, normalize_hub_inbound_request, normalize_hub_outbound_request,
    HubChatProcessRequest, HubInboundRequest, HubOutboundRequest,
};
pub use marker_lifecycle::{
    has_marker_syntax, strip_marker_syntax_from_content, strip_marker_syntax_from_messages,
    strip_marker_syntax_from_text, MarkerSyntaxMatch, StripMarkerContentResult,
    StripMarkerMessagesResult, StripMarkerSyntaxResult,
};
pub use mcp_resource_discovery::{
    collect_mcp_servers_from_messages, detect_empty_mcp_list_from_messages,
    extract_mcp_server_labels_from_output,
};
pub use message_content_text::{
    extract_captured_message_text, extract_text_from_message_content, extract_unknown_text,
};
pub use message_utils::{
    analyze_media_attachments, detect_extended_thinking_keyword, detect_image_attachment,
    detect_keyword, extract_message_text, get_latest_message_role, get_latest_user_message_index,
    MediaAttachmentSignals,
};
pub use pre_command_directive::{parse_pre_command_directive, PreCommandDirective};
pub use pre_command_state::{
    deserialize_pre_command_state, serialize_pre_command_state, PreCommandState,
};
pub use pre_command_token::read_pre_command_token;
pub use provider_target_hint::resolve_responses_target_provider;
pub use reasoning_markup::{strip_reasoning_transport_noise, value_may_contain_reasoning_markup};
pub use responses_continuation_materialize::{
    canonical_messages_contain_tool_call, materialize_responses_continuation_fallback,
};
pub use responses_continuation_policy::{
    provider_supports_native_responses_continuation, resolve_responses_continuation_owner,
    ResponsesContinuationContext, ResponsesContinuationDecision, ResponsesContinuationOwner,
};
pub use responses_conversation::{
    materialize_responses_continuation_from_entry, prepare_responses_conversation_entry,
    project_responses_native_continuation, record_responses_conversation_response,
    response_id_from_continuation_request, resume_responses_conversation,
    ResponsesConversationEntry,
};
pub use responses_ingress::{
    build_responses_request_envelope, normalize_responses_ingress_body, serialize_responses_shell,
    ResponsesIngressError, DEFAULT_RESPONSES_OPERATION,
};
pub use responses_protocol_mapping_audit::{
    build_responses_cross_protocol_audit, RESPONSES_SOURCE_PROTOCOL, TARGET_PROTOCOL_ANTHROPIC,
    TARGET_PROTOCOL_GEMINI,
};
pub use router_selection_input::{
    extract_router_request_hints, normalize_router_request_payload, RouterFeatureHints,
    RouterRequestHints,
};
pub use routing_instruction_clean::{
    clean_messages_from_routing_instructions, strip_code_segments,
};
pub use routing_instruction_preprocess::{
    has_clear_instruction, has_stop_message_clear_instruction, preprocess_routing_instructions,
};
pub use routing_stop_message_codec::{
    apply_stop_message_state_fallback_patch, ensure_stop_message_mode_max_repeats,
    merge_reasoning_stop_serialization, normalize_reasoning_stop_mode, ReasoningStopMode,
    RoutingStopMessageState,
};
pub use stop_gateway::{
    has_embedded_tool_call_markers_in_chat_message, has_harvestable_tool_markers,
    has_tool_like_output, inspect_stop_gateway_signal, is_stop_eligible_for_server_tool,
    StopGatewayContext,
};
pub use stop_message_state::{
    has_armed_stop_message_state, normalize_stop_message_ai_history_entries,
    normalize_stop_message_ai_mode, normalize_stop_message_stage_mode,
    resolve_stop_message_max_repeats, resolve_stop_message_snapshot, StopMessageAiMode,
    StopMessageSnapshot, StopMessageStageMode, DEFAULT_STOP_MESSAGE_MAX_REPEATS,
};
pub use tool_description::{
    append_apply_patch_reminder, build_shell_description, has_apply_patch_tool_declared,
    is_shell_tool_name, normalize_tool_name,
};
pub use tool_protocol_invariants::{
    normalize_request_tool_choice_policy, normalize_response_finish_invariants,
};
pub use tool_registry_guards::{
    allowed_tool_names, detect_forbidden_write, is_allowed_tool_name, is_image_path,
};
pub use tool_signals::{
    canonicalize_tool_name, choose_higher_priority_tool_category, classify_tool_call_for_report,
    detect_coding_tool, detect_last_assistant_tool_category, detect_vision_tool,
    detect_web_search_tool_declared, detect_web_tool, extract_meaningful_declared_tool_names,
    ToolCategory, ToolClassification,
};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RequestEnvelope {
    pub operation: String,
    pub payload: String,
}

impl RequestEnvelope {
    pub fn new(operation: impl Into<String>, payload: impl Into<String>) -> Self {
        Self {
            operation: operation.into(),
            payload: payload.into(),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RouteDecision {
    pub target_block: String,
    pub selected_route: Option<String>,
    pub selected_target: Option<String>,
    pub candidate_routes: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProviderRouteHandoff {
    pub selected_route: Option<String>,
    pub selected_target: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ToolPlan {
    pub scheduled: Vec<String>,
}

impl ToolPlan {
    pub fn empty() -> Self {
        Self {
            scheduled: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct ResponseEnvelope {
    pub route: RouteDecision,
    pub tool_plan: ToolPlan,
    pub provider_runtime: &'static str,
    pub status: String,
    pub payload: String,
    pub required_action: Value,
    pub raw_provider_response: Value,
}

pub trait ProviderRuntime {
    fn runtime_name(&self) -> &'static str;
    fn execute(&self, request: &ProviderRequestCarrier) -> ProviderResponseCarrier;
}

pub fn parse_tool_args_json(input: &str) -> Value {
    args_json::parse_tool_args_json(input)
}
