use crate::route_candidates::RoutingPools;
use std::collections::{BTreeMap, BTreeSet};

#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct ProviderRegistryView {
    runtimes: BTreeMap<String, ProviderRuntimeView>,
}

impl ProviderRegistryView {
    pub fn from_runtimes(runtimes: Vec<ProviderRuntimeView>) -> Self {
        Self {
            runtimes: runtimes
                .into_iter()
                .map(|runtime| (runtime.provider_key.clone(), runtime))
                .collect(),
        }
    }

    pub fn get(&self, provider_key: &str) -> Option<&ProviderRuntimeView> {
        self.runtimes.get(provider_key)
    }

    pub fn list_provider_keys(&self, provider_id: &str) -> Vec<String> {
        let normalized_provider = provider_id.trim();
        let mut matches = self
            .runtimes
            .values()
            .filter(|runtime| runtime.provider_id == normalized_provider)
            .cloned()
            .collect::<Vec<_>>();
        matches.sort_by(|left, right| {
            left.runtime_index
                .cmp(&right.runtime_index)
                .then(left.provider_key.cmp(&right.provider_key))
        });
        matches
            .into_iter()
            .map(|runtime| runtime.provider_key)
            .collect()
    }

    pub fn resolve_runtime_key_by_index(
        &self,
        provider_id: &str,
        key_index: usize,
    ) -> Option<String> {
        self.runtimes
            .values()
            .find(|runtime| {
                runtime.provider_id == provider_id.trim()
                    && runtime.runtime_index == Some(key_index)
            })
            .map(|runtime| runtime.provider_key.clone())
    }

    pub fn resolve_runtime_key_by_alias(&self, provider_id: &str, alias: &str) -> Option<String> {
        let normalized_alias = alias.trim();
        self.runtimes
            .values()
            .find(|runtime| {
                runtime.provider_id == provider_id.trim()
                    && runtime.key_alias.as_deref() == Some(normalized_alias)
            })
            .map(|runtime| runtime.provider_key.clone())
    }

    pub fn model_id_of(&self, provider_key: &str) -> Option<String> {
        self.get(provider_key)
            .and_then(|runtime| runtime.model_id.clone())
            .or_else(|| infer_model_id_from_provider_key(provider_key))
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProviderRuntimeView {
    pub provider_key: String,
    pub provider_id: String,
    pub key_alias: Option<String>,
    pub runtime_index: Option<usize>,
    pub model_id: Option<String>,
}

impl ProviderRuntimeView {
    pub fn new(provider_key: impl Into<String>, provider_id: impl Into<String>) -> Self {
        Self {
            provider_key: provider_key.into(),
            provider_id: provider_id.into(),
            key_alias: None,
            runtime_index: None,
            model_id: None,
        }
    }

    pub fn with_alias(mut self, alias: impl Into<String>) -> Self {
        self.key_alias = Some(alias.into());
        self
    }

    pub fn with_runtime_index(mut self, runtime_index: usize) -> Self {
        self.runtime_index = Some(runtime_index);
        self
    }

    pub fn with_model_id(mut self, model_id: impl Into<String>) -> Self {
        self.model_id = Some(model_id.into());
        self
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct RoutingInstructionState {
    pub allowed_providers: BTreeSet<String>,
    pub disabled_providers: BTreeSet<String>,
    pub disabled_key_aliases: BTreeMap<String, BTreeSet<String>>,
    pub disabled_key_indexes: BTreeMap<String, BTreeSet<usize>>,
    pub disabled_models: BTreeMap<String, BTreeSet<String>>,
}

pub fn filter_candidates_by_routing_state(
    routes: &[String],
    state: &RoutingInstructionState,
    routing: &RoutingPools,
    provider_registry: &ProviderRegistryView,
) -> Vec<String> {
    if state.allowed_providers.is_empty()
        && state.disabled_providers.is_empty()
        && state.disabled_key_aliases.is_empty()
        && state.disabled_key_indexes.is_empty()
        && state.disabled_models.is_empty()
    {
        return routes.to_vec();
    }

    routes
        .iter()
        .filter(|route_name| route_allows_any_target(route_name, state, routing, provider_registry))
        .cloned()
        .collect()
}

fn route_allows_any_target(
    route_name: &str,
    state: &RoutingInstructionState,
    routing: &RoutingPools,
    provider_registry: &ProviderRegistryView,
) -> bool {
    let Some(pools) = routing.get(route_name) else {
        return false;
    };

    pools.iter().any(|pool| {
        pool.targets
            .iter()
            .any(|provider_key| provider_key_allowed(provider_key, state, provider_registry))
    })
}

fn provider_key_allowed(
    provider_key: &str,
    state: &RoutingInstructionState,
    provider_registry: &ProviderRegistryView,
) -> bool {
    let provider = provider_registry.get(provider_key);
    let provider_id = provider
        .map(|runtime| runtime.provider_id.clone())
        .or_else(|| infer_provider_id_from_provider_key(provider_key));
    let Some(provider_id) = provider_id else {
        return false;
    };

    if !state.allowed_providers.is_empty() && !state.allowed_providers.contains(&provider_id) {
        return false;
    }

    if state.disabled_providers.contains(&provider_id) {
        return false;
    }

    let key_alias = provider
        .and_then(|runtime| runtime.key_alias.clone())
        .or_else(|| infer_key_alias_from_provider_key(provider_key));
    if key_alias.as_ref().is_some_and(|alias| {
        state
            .disabled_key_aliases
            .get(&provider_id)
            .is_some_and(|aliases| aliases.contains(alias))
    }) {
        return false;
    }

    let key_index = provider
        .and_then(|runtime| runtime.runtime_index)
        .or_else(|| infer_key_index_from_provider_key(provider_key));
    if key_index.is_some_and(|index| {
        state
            .disabled_key_indexes
            .get(&provider_id)
            .is_some_and(|indexes| indexes.contains(&index))
    }) {
        return false;
    }

    let model_id = provider_registry.model_id_of(provider_key);
    if model_id.as_ref().is_some_and(|model_id| {
        state
            .disabled_models
            .get(&provider_id)
            .is_some_and(|models| models.contains(model_id))
    }) {
        return false;
    }

    true
}

fn infer_provider_id_from_provider_key(provider_key: &str) -> Option<String> {
    provider_key
        .split('.')
        .next()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
}

fn infer_key_alias_from_provider_key(provider_key: &str) -> Option<String> {
    let parts = provider_key.split('.').map(str::trim).collect::<Vec<_>>();
    if parts.len() >= 3 && !parts[1].is_empty() {
        Some(parts[1].to_string())
    } else {
        None
    }
}

fn infer_key_index_from_provider_key(provider_key: &str) -> Option<usize> {
    infer_key_alias_from_provider_key(provider_key).and_then(|alias| alias.parse::<usize>().ok())
}

fn infer_model_id_from_provider_key(provider_key: &str) -> Option<String> {
    let parts = provider_key.split('.').map(str::trim).collect::<Vec<_>>();
    if parts.len() >= 2 {
        parts
            .last()
            .filter(|value| !value.is_empty())
            .map(|value| value.to_string())
    } else {
        None
    }
}
