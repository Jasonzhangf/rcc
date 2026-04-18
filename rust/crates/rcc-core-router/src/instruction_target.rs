use crate::routing_state_filter::ProviderRegistryView;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ForcedInstructionTarget {
    pub provider: String,
    pub model: Option<String>,
    pub key_alias: Option<String>,
    pub key_index: Option<usize>,
    pub path_length: usize,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum InstructionTargetMode {
    Exact,
    Filter,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct InstructionTargetResult {
    pub mode: InstructionTargetMode,
    pub keys: Vec<String>,
}

pub fn resolve_instruction_target(
    target: &ForcedInstructionTarget,
    provider_registry: &ProviderRegistryView,
) -> Option<InstructionTargetResult> {
    let normalized_provider = target.provider.trim();
    if normalized_provider.is_empty() {
        return None;
    }

    let provider_keys = provider_registry.list_provider_keys(normalized_provider);
    if provider_keys.is_empty() {
        return None;
    }

    let alias = target.key_alias.as_deref().map(str::trim).unwrap_or("");
    let alias_explicit = !alias.is_empty() && target.path_length == 3;
    if alias_explicit {
        let alias_keys = provider_keys
            .iter()
            .filter(|provider_key| {
                provider_registry
                    .get(provider_key)
                    .and_then(|runtime| runtime.key_alias.as_deref())
                    == Some(alias)
            })
            .cloned()
            .collect::<Vec<_>>();
        if !alias_keys.is_empty() {
            if let Some(model) = normalized_model(target) {
                let matching = alias_keys
                    .iter()
                    .filter(|provider_key| {
                        provider_registry.model_id_of(provider_key).as_deref() == Some(model)
                    })
                    .cloned()
                    .collect::<Vec<_>>();
                if matching.len() == 1 {
                    return Some(InstructionTargetResult {
                        mode: InstructionTargetMode::Exact,
                        keys: matching,
                    });
                }
                if !matching.is_empty() {
                    return Some(InstructionTargetResult {
                        mode: InstructionTargetMode::Filter,
                        keys: matching,
                    });
                }
            }

            return Some(InstructionTargetResult {
                mode: InstructionTargetMode::Filter,
                keys: alias_keys,
            });
        }
    }

    if let Some(key_index) = target.key_index.filter(|index| *index > 0) {
        if let Some(runtime_key) =
            provider_registry.resolve_runtime_key_by_index(normalized_provider, key_index)
        {
            return Some(InstructionTargetResult {
                mode: InstructionTargetMode::Exact,
                keys: vec![runtime_key],
            });
        }
    }

    if let Some(model) = normalized_model(target) {
        let matching_keys = provider_keys
            .iter()
            .filter(|provider_key| {
                provider_registry.model_id_of(provider_key).as_deref() == Some(model)
            })
            .cloned()
            .collect::<Vec<_>>();
        if !matching_keys.is_empty() {
            return Some(InstructionTargetResult {
                mode: InstructionTargetMode::Filter,
                keys: matching_keys,
            });
        }
    }

    if !alias.is_empty() && !alias_explicit {
        if let Some(runtime_key) =
            provider_registry.resolve_runtime_key_by_alias(normalized_provider, alias)
        {
            return Some(InstructionTargetResult {
                mode: InstructionTargetMode::Exact,
                keys: vec![runtime_key],
            });
        }
    }

    Some(InstructionTargetResult {
        mode: InstructionTargetMode::Filter,
        keys: provider_keys,
    })
}

fn normalized_model<'a>(target: &'a ForcedInstructionTarget) -> Option<&'a str> {
    target
        .model
        .as_deref()
        .map(str::trim)
        .filter(|model| !model.is_empty())
}
