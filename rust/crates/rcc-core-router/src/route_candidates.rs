use std::collections::{BTreeMap, BTreeSet};

use crate::routing_state_filter::{ModelCapability, ProviderRegistryView};

pub const DEFAULT_ROUTE: &str = "default";

#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct RouteFeatures {
    pub has_image_attachment: bool,
    pub has_video_attachment: bool,
    pub has_remote_video_attachment: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RoutePoolTier {
    pub id: String,
    pub targets: Vec<String>,
    pub priority: i32,
}

impl RoutePoolTier {
    pub fn new(
        id: impl Into<String>,
        targets: impl IntoIterator<Item = impl Into<String>>,
        priority: i32,
    ) -> Self {
        Self {
            id: id.into(),
            targets: targets.into_iter().map(Into::into).collect(),
            priority,
        }
    }
}

pub type RoutingPools = BTreeMap<String, Vec<RoutePoolTier>>;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RouteCandidateInput {
    pub requested_route: String,
    pub classification_candidates: Vec<String>,
    pub features: RouteFeatures,
    pub routing: RoutingPools,
}

pub fn normalize_route_alias(route_name: &str) -> String {
    let normalized = route_name.trim();
    if normalized.is_empty() {
        DEFAULT_ROUTE.to_string()
    } else {
        normalized.to_string()
    }
}

pub fn build_route_candidates(input: &RouteCandidateInput) -> Vec<String> {
    let mut base_list = if input.classification_candidates.is_empty() {
        vec![normalize_route_alias(&input.requested_route)]
    } else {
        input
            .classification_candidates
            .iter()
            .map(|candidate| normalize_route_alias(candidate))
            .collect::<Vec<_>>()
    };

    if input.features.has_video_attachment
        && input.features.has_remote_video_attachment
        && route_has_targets(input.routing.get("video"))
    {
        base_list.insert(0, "video".to_string());
    }

    if input.features.has_image_attachment {
        if route_has_targets(input.routing.get("multimodal")) {
            base_list.insert(0, "multimodal".to_string());
        } else if route_has_targets(input.routing.get("vision")) {
            base_list.insert(0, "vision".to_string());
        }
    }

    let mut deduped = Vec::new();
    let mut seen = BTreeSet::new();
    for route_name in base_list {
        if !route_name.is_empty() && seen.insert(route_name.clone()) {
            deduped.push(route_name);
        }
    }

    if route_has_targets(input.routing.get(DEFAULT_ROUTE)) && !seen.contains(DEFAULT_ROUTE) {
        deduped.push(DEFAULT_ROUTE.to_string());
    }

    let filtered = deduped
        .into_iter()
        .filter(|route_name| route_has_targets(input.routing.get(route_name.as_str())))
        .collect::<Vec<_>>();

    if filtered.is_empty() {
        vec![DEFAULT_ROUTE.to_string()]
    } else {
        filtered
    }
}

pub fn route_has_targets(pools: Option<&Vec<RoutePoolTier>>) -> bool {
    pools.is_some_and(|tiers| tiers.iter().any(|tier| !tier.targets.is_empty()))
}

pub fn route_supports_capability(
    route_name: &str,
    capability: &ModelCapability,
    routing: &RoutingPools,
    provider_registry: &ProviderRegistryView,
) -> bool {
    let Some(pools) = routing.get(route_name) else {
        return false;
    };

    pools.iter().any(|pool| {
        pool.targets
            .iter()
            .any(|provider_key| provider_registry.has_capability(provider_key, capability))
    })
}

pub fn reorder_for_capability(
    route_names: &[String],
    capability: &ModelCapability,
    routing: &RoutingPools,
    provider_registry: &ProviderRegistryView,
) -> Vec<String> {
    let unique = dedupe_route_names(route_names);
    if unique.is_empty() {
        return unique;
    }
    let preferred = unique
        .iter()
        .filter(|route_name| {
            route_supports_capability(route_name, capability, routing, provider_registry)
        })
        .cloned()
        .collect::<Vec<_>>();
    if preferred.is_empty() {
        return unique;
    }
    let remaining = unique
        .iter()
        .filter(|route_name| !preferred.contains(route_name))
        .cloned()
        .collect::<Vec<_>>();
    [preferred, remaining].concat()
}

pub fn reorder_for_preferred_model(
    route_names: &[String],
    model_id: &str,
    routing: &RoutingPools,
    provider_registry: &ProviderRegistryView,
) -> Vec<String> {
    let unique = dedupe_route_names(route_names);
    let normalized_model = model_id.trim().to_lowercase();
    if unique.is_empty() || normalized_model.is_empty() {
        return unique;
    }
    let preferred = unique
        .iter()
        .filter(|route_name| {
            route_supports_model(route_name, &normalized_model, routing, provider_registry)
        })
        .cloned()
        .collect::<Vec<_>>();
    if preferred.is_empty() {
        return unique;
    }
    let remaining = unique
        .iter()
        .filter(|route_name| !preferred.contains(route_name))
        .cloned()
        .collect::<Vec<_>>();
    [preferred, remaining].concat()
}

fn route_supports_model(
    route_name: &str,
    normalized_model: &str,
    routing: &RoutingPools,
    provider_registry: &ProviderRegistryView,
) -> bool {
    let Some(pools) = routing.get(route_name) else {
        return false;
    };

    pools.iter().any(|pool| {
        pool.targets.iter().any(|provider_key| {
            provider_registry
                .model_id_of(provider_key)
                .map(|candidate| candidate.trim().to_lowercase() == normalized_model)
                .unwrap_or(false)
        })
    })
}

fn dedupe_route_names(route_names: &[String]) -> Vec<String> {
    let mut unique = Vec::new();
    let mut seen = BTreeSet::new();
    for route_name in route_names {
        if !route_name.is_empty() && seen.insert(route_name.clone()) {
            unique.push(route_name.clone());
        }
    }
    unique
}
