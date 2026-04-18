mod instruction_target;
mod route_candidates;
mod routing_state_filter;

use rcc_core_domain::{RequestEnvelope, RouteDecision};

pub use instruction_target::{
    resolve_instruction_target, ForcedInstructionTarget, InstructionTargetMode,
    InstructionTargetResult,
};
pub use route_candidates::{
    build_route_candidates, normalize_route_alias, RouteCandidateInput, RouteFeatures,
    RoutePoolTier, RoutingPools, DEFAULT_ROUTE,
};
pub use routing_state_filter::{
    filter_candidates_by_routing_state, ProviderRegistryView, ProviderRuntimeView,
    RoutingInstructionState,
};

#[derive(Debug, Default)]
pub struct RouterBlock;

impl RouterBlock {
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

    pub fn select(&self, request: &RequestEnvelope) -> RouteDecision {
        let target_block = if request.operation.contains("tool") {
            "servertool"
        } else {
            "pipeline"
        };
        RouteDecision {
            target_block: target_block.to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{
        build_route_candidates, filter_candidates_by_routing_state, normalize_route_alias,
        resolve_instruction_target, ForcedInstructionTarget, InstructionTargetMode,
        ProviderRegistryView, ProviderRuntimeView, RouteCandidateInput, RouteFeatures,
        RoutePoolTier, RouterBlock, RoutingInstructionState, RoutingPools, DEFAULT_ROUTE,
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
                .with_model_id("gpt-5"),
            ProviderRuntimeView::new("openai.vision.gpt-4o", "openai")
                .with_alias("vision")
                .with_runtime_index(2)
                .with_model_id("gpt-4o"),
            ProviderRuntimeView::new("openai.video.gpt-4.1", "openai")
                .with_alias("video")
                .with_runtime_index(3)
                .with_model_id("gpt-4.1"),
            ProviderRuntimeView::new("anthropic.ops.claude-3", "anthropic")
                .with_alias("ops")
                .with_runtime_index(1)
                .with_model_id("claude-3"),
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
    fn router_block_keeps_select_as_thin_compat_shell() {
        let block = RouterBlock::default();
        let tool_route = block.select(&RequestEnvelope::new("tool.followup", "{}"));
        let pipeline_route = block.select(&RequestEnvelope::new("chat", "{}"));

        assert_eq!(tool_route.target_block, "servertool");
        assert_eq!(pipeline_route.target_block, "pipeline");
    }
}
