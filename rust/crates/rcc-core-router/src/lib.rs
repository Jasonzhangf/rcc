mod instruction_target;
mod route_candidates;
mod routing_state_filter;

use rcc_core_domain::{
    extract_router_request_hints, normalize_router_request_payload, RequestEnvelope, RouteDecision,
    RouterRequestHints,
};

pub use instruction_target::{
    resolve_instruction_target, ForcedInstructionTarget, InstructionTargetMode,
    InstructionTargetResult,
};
pub use route_candidates::{
    build_route_candidates, normalize_route_alias, reorder_for_capability,
    reorder_for_preferred_model, resolve_selected_target, route_supports_capability,
    RouteCandidateInput, RouteFeatures, RoutePoolTier, RoutingPools, DEFAULT_ROUTE,
};
pub use routing_state_filter::{
    filter_candidates_by_routing_state, ModelCapability, ProviderRegistryView, ProviderRuntimeView,
    RoutingInstructionState,
};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RouterSelectInput {
    pub operation: String,
    pub explicit_target_block: Option<String>,
    pub requested_route: Option<String>,
    pub classification_candidates: Vec<String>,
    pub features: RouteFeatures,
}

#[derive(Debug, Clone, Default)]
pub struct RouterBlock {
    routing: RoutingPools,
}

impl RouterBlock {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_routing(routing: RoutingPools) -> Self {
        Self { routing }
    }

    pub fn build_route_candidates(&self, input: &RouteCandidateInput) -> Vec<String> {
        build_route_candidates(input)
    }

    pub fn filter_candidates_by_routing_state(
        &self,
        routes: &[String],
        state: &RoutingInstructionState,
        routing: &RoutingPools,
        provider_registry: &ProviderRegistryView,
    ) -> Vec<String> {
        filter_candidates_by_routing_state(routes, state, routing, provider_registry)
    }

    pub fn resolve_instruction_target(
        &self,
        target: &ForcedInstructionTarget,
        provider_registry: &ProviderRegistryView,
    ) -> Option<InstructionTargetResult> {
        resolve_instruction_target(target, provider_registry)
    }

    pub fn reorder_for_capability(
        &self,
        route_names: &[String],
        capability: &ModelCapability,
        routing: &RoutingPools,
        provider_registry: &ProviderRegistryView,
    ) -> Vec<String> {
        reorder_for_capability(route_names, capability, routing, provider_registry)
    }

    pub fn reorder_for_preferred_model(
        &self,
        route_names: &[String],
        model_id: &str,
        routing: &RoutingPools,
        provider_registry: &ProviderRegistryView,
    ) -> Vec<String> {
        reorder_for_preferred_model(route_names, model_id, routing, provider_registry)
    }

    pub fn build_select_input(&self, request: &RequestEnvelope) -> RouterSelectInput {
        build_select_input(request)
    }

    pub fn select(&self, request: &RequestEnvelope) -> RouteDecision {
        let input = self.build_select_input(request);
        let target_block = resolve_target_block(&input);
        let candidate_routes = if input.explicit_target_block.is_none()
            && target_block == "pipeline"
            && !self.routing.is_empty()
        {
            self.select_candidate_routes_from_input(&input)
        } else {
            Vec::new()
        };
        let selected_route = candidate_routes.first().cloned();
        let selected_target = selected_route
            .as_deref()
            .and_then(|route_name| resolve_selected_target(route_name, &self.routing));
        RouteDecision {
            target_block,
            selected_route,
            selected_target,
            candidate_routes,
        }
    }

    pub fn select_candidate_routes(&self, request: &RequestEnvelope) -> Vec<String> {
        let input = self.build_select_input(request);
        self.select_candidate_routes_from_input(&input)
    }

    fn select_candidate_routes_from_input(&self, input: &RouterSelectInput) -> Vec<String> {
        if self.routing.is_empty() {
            return Vec::new();
        }

        build_route_candidates(&RouteCandidateInput {
            requested_route: input
                .requested_route
                .clone()
                .unwrap_or_else(|| DEFAULT_ROUTE.to_string()),
            classification_candidates: input.classification_candidates.clone(),
            features: input.features.clone(),
            routing: self.routing.clone(),
        })
    }
}

pub fn build_select_input(request: &RequestEnvelope) -> RouterSelectInput {
    let payload = normalize_router_request_payload(&request.payload);
    let hints = extract_router_request_hints(&payload);
    build_select_input_from_hints(request, hints)
}

fn build_select_input_from_hints(
    request: &RequestEnvelope,
    hints: RouterRequestHints,
) -> RouterSelectInput {
    RouterSelectInput {
        operation: request.operation.trim().to_string(),
        explicit_target_block: hints.explicit_target_block,
        requested_route: hints.requested_route,
        classification_candidates: hints.classification_candidates,
        features: RouteFeatures {
            has_image_attachment: hints.features.has_image_attachment,
            has_video_attachment: hints.features.has_video_attachment,
            has_remote_video_attachment: hints.features.has_remote_video_attachment,
        },
    }
}

fn resolve_target_block(input: &RouterSelectInput) -> String {
    if let Some(target_block) = input.explicit_target_block.clone() {
        return target_block;
    }

    if is_servertool_operation(&input.operation) {
        "servertool".to_string()
    } else {
        "pipeline".to_string()
    }
}

fn is_servertool_operation(operation: &str) -> bool {
    let normalized = operation.trim();
    normalized == "tool"
        || normalized.starts_with("tool.")
        || normalized == "clock"
        || normalized.starts_with("clock.")
}

#[cfg(test)]
mod tests {
    use super::{
        build_route_candidates, build_select_input, filter_candidates_by_routing_state,
        normalize_route_alias, reorder_for_capability, reorder_for_preferred_model,
        resolve_instruction_target, route_supports_capability, ForcedInstructionTarget,
        InstructionTargetMode, ModelCapability, ProviderRegistryView, ProviderRuntimeView,
        RouteCandidateInput, RouteFeatures, RoutePoolTier, RouterBlock, RoutingInstructionState,
        RoutingPools, DEFAULT_ROUTE,
    };
    use rcc_core_domain::RequestEnvelope;

    fn routing_pools() -> RoutingPools {
        RoutingPools::from([
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
                "vision".to_string(),
                vec![RoutePoolTier::new(
                    "vision.primary",
                    vec!["openai.vision.gpt-4o"],
                    100,
                )],
            ),
            (
                "video".to_string(),
                vec![RoutePoolTier::new(
                    "video.primary",
                    vec!["openai.video.gpt-4.1"],
                    100,
                )],
            ),
            (
                "tools".to_string(),
                vec![RoutePoolTier::new(
                    "tools.primary",
                    vec!["openai.primary.gpt-5"],
                    100,
                )],
            ),
        ])
    }

    fn provider_registry() -> ProviderRegistryView {
        ProviderRegistryView::from_runtimes(vec![
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
            ProviderRuntimeView::new("openai.video.gpt-4.1", "openai")
                .with_alias("video")
                .with_runtime_index(3)
                .with_model_id("gpt-4.1")
                .with_model_capabilities([ModelCapability::Video]),
            ProviderRuntimeView::new("anthropic.ops.claude-3", "anthropic")
                .with_alias("ops")
                .with_runtime_index(1)
                .with_model_id("claude-3")
                .with_model_capabilities([ModelCapability::WebSearch]),
        ])
    }

    #[test]
    fn normalize_route_alias_falls_back_to_default_route() {
        assert_eq!(normalize_route_alias(""), DEFAULT_ROUTE);
        assert_eq!(normalize_route_alias("  "), DEFAULT_ROUTE);
        assert_eq!(normalize_route_alias(" tools "), "tools");
    }

    #[test]
    fn build_route_candidates_prefers_classification_and_appends_default() {
        let candidates = build_route_candidates(&RouteCandidateInput {
            requested_route: "tools".to_string(),
            classification_candidates: vec!["tools".to_string(), "default".to_string()],
            features: RouteFeatures::default(),
            routing: routing_pools(),
        });

        assert_eq!(candidates, vec!["tools".to_string(), "default".to_string()]);
    }

    #[test]
    fn build_route_candidates_prepends_multimodal_for_image_attachment() {
        let candidates = build_route_candidates(&RouteCandidateInput {
            requested_route: "default".to_string(),
            classification_candidates: vec![],
            features: RouteFeatures {
                has_image_attachment: true,
                ..RouteFeatures::default()
            },
            routing: routing_pools(),
        });

        assert_eq!(
            candidates,
            vec!["multimodal".to_string(), "default".to_string()]
        );
    }

    #[test]
    fn build_route_candidates_prepends_video_for_remote_video_attachment() {
        let candidates = build_route_candidates(&RouteCandidateInput {
            requested_route: "default".to_string(),
            classification_candidates: vec![],
            features: RouteFeatures {
                has_video_attachment: true,
                has_remote_video_attachment: true,
                ..RouteFeatures::default()
            },
            routing: routing_pools(),
        });

        assert_eq!(candidates, vec!["video".to_string(), "default".to_string()]);
    }

    #[test]
    fn filter_candidates_by_routing_state_applies_allowed_and_disabled_provider_rules() {
        let routes = vec!["default".to_string(), "tools".to_string()];
        let mut state = RoutingInstructionState::default();
        state.allowed_providers.insert("openai".to_string());
        state.disabled_providers.insert("anthropic".to_string());

        let filtered = filter_candidates_by_routing_state(
            &routes,
            &state,
            &routing_pools(),
            &provider_registry(),
        );

        assert_eq!(filtered, routes);
    }

    #[test]
    fn filter_candidates_by_routing_state_removes_route_when_all_targets_are_disabled() {
        let routes = vec!["default".to_string(), "tools".to_string()];
        let mut state = RoutingInstructionState::default();
        state
            .disabled_key_aliases
            .entry("openai".to_string())
            .or_default()
            .extend([
                "primary".to_string(),
                "vision".to_string(),
                "video".to_string(),
            ]);
        state
            .disabled_models
            .entry("anthropic".to_string())
            .or_default()
            .insert("claude-3".to_string());

        let filtered = filter_candidates_by_routing_state(
            &routes,
            &state,
            &routing_pools(),
            &provider_registry(),
        );

        assert!(filtered.is_empty());
    }

    #[test]
    fn resolve_instruction_target_prefers_explicit_alias_and_model() {
        let result = resolve_instruction_target(
            &ForcedInstructionTarget {
                provider: "openai".to_string(),
                model: Some("gpt-5".to_string()),
                key_alias: Some("primary".to_string()),
                key_index: None,
                path_length: 3,
            },
            &provider_registry(),
        )
        .expect("explicit alias target");

        assert_eq!(result.mode, InstructionTargetMode::Exact);
        assert_eq!(result.keys, vec!["openai.primary.gpt-5".to_string()]);
    }

    #[test]
    fn resolve_instruction_target_supports_runtime_index_exact_match() {
        let result = resolve_instruction_target(
            &ForcedInstructionTarget {
                provider: "openai".to_string(),
                model: None,
                key_alias: None,
                key_index: Some(2),
                path_length: 2,
            },
            &provider_registry(),
        )
        .expect("key index target");

        assert_eq!(result.mode, InstructionTargetMode::Exact);
        assert_eq!(result.keys, vec!["openai.vision.gpt-4o".to_string()]);
    }

    #[test]
    fn route_supports_capability_detects_route_pool_capability() {
        let supported = route_supports_capability(
            "default",
            &ModelCapability::Thinking,
            &routing_pools(),
            &provider_registry(),
        );
        let unsupported = route_supports_capability(
            "tools",
            &ModelCapability::WebSearch,
            &routing_pools(),
            &provider_registry(),
        );

        assert!(supported);
        assert!(!unsupported);
    }

    #[test]
    fn reorder_for_capability_moves_supported_routes_to_front() {
        let reordered = reorder_for_capability(
            &[
                "tools".to_string(),
                "default".to_string(),
                "multimodal".to_string(),
            ],
            &ModelCapability::Thinking,
            &routing_pools(),
            &provider_registry(),
        );

        assert_eq!(
            reordered,
            vec![
                "tools".to_string(),
                "default".to_string(),
                "multimodal".to_string()
            ]
        );
    }

    #[test]
    fn reorder_for_preferred_model_moves_matching_routes_to_front() {
        let reordered = reorder_for_preferred_model(
            &[
                "default".to_string(),
                "multimodal".to_string(),
                "tools".to_string(),
            ],
            "gpt-4o",
            &routing_pools(),
            &provider_registry(),
        );

        assert_eq!(
            reordered,
            vec![
                "multimodal".to_string(),
                "default".to_string(),
                "tools".to_string()
            ]
        );
    }

    #[test]
    fn resolve_instruction_target_filters_by_model_when_alias_is_not_explicit() {
        let result = resolve_instruction_target(
            &ForcedInstructionTarget {
                provider: "openai".to_string(),
                model: Some("gpt-4o".to_string()),
                key_alias: Some("vision".to_string()),
                key_index: None,
                path_length: 2,
            },
            &provider_registry(),
        )
        .expect("model target");

        assert_eq!(result.mode, InstructionTargetMode::Filter);
        assert_eq!(result.keys, vec!["openai.vision.gpt-4o".to_string()]);
    }

    #[test]
    fn build_select_input_extracts_route_hints_from_payload() {
        let input = build_select_input(&RequestEnvelope::new(
            "responses",
            r#"{"routing":{"route":"tools","classification_candidates":["tools","default"]},"input":[{"type":"input_image","image_url":"file://board.png"}]}"#,
        ));

        assert_eq!(input.operation, "responses");
        assert_eq!(input.requested_route.as_deref(), Some("tools"));
        assert_eq!(
            input.classification_candidates,
            vec!["tools".to_string(), "default".to_string()]
        );
        assert!(input.features.has_image_attachment);
    }

    #[test]
    fn router_block_select_routes_tool_operations_to_servertool() {
        let block = RouterBlock::default();
        let tool_route = block.select(&RequestEnvelope::new("tool.followup", "{}"));
        let pipeline_route = block.select(&RequestEnvelope::new("chat", "{}"));

        assert_eq!(tool_route.target_block, "servertool");
        assert_eq!(tool_route.selected_route, None);
        assert_eq!(tool_route.selected_target, None);
        assert!(tool_route.candidate_routes.is_empty());
        assert_eq!(pipeline_route.target_block, "pipeline");
        assert_eq!(pipeline_route.selected_route, None);
        assert_eq!(pipeline_route.selected_target, None);
        assert!(pipeline_route.candidate_routes.is_empty());
    }

    #[test]
    fn router_block_select_respects_explicit_target_block_from_payload() {
        let block = RouterBlock::default();
        let route = block.select(&RequestEnvelope::new(
            "responses",
            r#"{"routing":{"target_block":"servertool"}}"#,
        ));

        assert_eq!(route.target_block, "servertool");
        assert_eq!(route.selected_route, None);
        assert_eq!(route.selected_target, None);
        assert!(route.candidate_routes.is_empty());
    }

    #[test]
    fn runtime_router_selects_route_from_bootstrap_pools() {
        let block = RouterBlock::with_routing(routing_pools());
        let route = block.select(&RequestEnvelope::new(
            "responses",
            r#"{
  "input": [
    { "type": "input_text", "text": "继续执行" },
    { "type": "input_image", "image_url": "file://whiteboard.png" }
  ]
}"#,
        ));

        assert_eq!(route.target_block, "pipeline");
        assert_eq!(route.selected_route.as_deref(), Some("multimodal"));
        assert_eq!(
            route.selected_target.as_deref(),
            Some("openai.vision.gpt-4o")
        );
        assert_eq!(
            route.candidate_routes,
            vec!["multimodal".to_string(), "default".to_string()]
        );
    }

    #[test]
    fn runtime_router_selects_target_from_bootstrap_pools() {
        let block = RouterBlock::with_routing(routing_pools());
        let route = block.select(&RequestEnvelope::new(
            "responses",
            r#"{
  "input": [
    { "type": "input_text", "text": "继续执行" },
    { "type": "input_image", "image_url": "file://whiteboard.png" }
  ]
}"#,
        ));

        assert_eq!(
            route.selected_target.as_deref(),
            Some("openai.vision.gpt-4o")
        );
    }

    #[test]
    fn router_block_exposes_batch02_reorder_methods() {
        let block = RouterBlock::default();
        let reordered = block.reorder_for_capability(
            &["tools".to_string(), "default".to_string()],
            &ModelCapability::Thinking,
            &routing_pools(),
            &provider_registry(),
        );

        assert_eq!(reordered, vec!["tools".to_string(), "default".to_string()]);
    }
}
