#[derive(Debug, Clone, PartialEq)]
pub struct ContextWeightedConfigInput {
    pub enabled: Option<bool>,
    pub client_cap_tokens: Option<f64>,
    pub gamma: Option<f64>,
    pub max_multiplier: Option<f64>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ResolvedContextWeightedConfig {
    pub enabled: bool,
    pub client_cap_tokens: i64,
    pub gamma: f64,
    pub max_multiplier: f64,
}

pub const DEFAULT_CONTEXT_WEIGHTED_CONFIG: ResolvedContextWeightedConfig =
    ResolvedContextWeightedConfig {
        enabled: false,
        client_cap_tokens: 200_000,
        gamma: 1.0,
        max_multiplier: 2.0,
    };

pub fn resolve_context_weighted_config(
    raw: Option<&ContextWeightedConfigInput>,
) -> ResolvedContextWeightedConfig {
    let enabled = raw
        .and_then(|value| value.enabled)
        .unwrap_or(DEFAULT_CONTEXT_WEIGHTED_CONFIG.enabled);
    let client_cap_tokens = raw
        .and_then(|value| value.client_cap_tokens)
        .filter(|value| value.is_finite() && *value > 0.0)
        .map(|value| value.floor() as i64)
        .unwrap_or(DEFAULT_CONTEXT_WEIGHTED_CONFIG.client_cap_tokens);
    let gamma = raw
        .and_then(|value| value.gamma)
        .filter(|value| value.is_finite() && *value > 0.0)
        .unwrap_or(DEFAULT_CONTEXT_WEIGHTED_CONFIG.gamma);
    let max_multiplier = raw
        .and_then(|value| value.max_multiplier)
        .filter(|value| value.is_finite() && *value >= 1.0)
        .unwrap_or(DEFAULT_CONTEXT_WEIGHTED_CONFIG.max_multiplier);

    ResolvedContextWeightedConfig {
        enabled,
        client_cap_tokens,
        gamma,
        max_multiplier,
    }
}

pub fn compute_effective_safe_window_tokens(
    model_max_tokens: f64,
    warn_ratio: Option<f64>,
    client_cap_tokens: Option<f64>,
) -> i64 {
    let model_max_tokens = if model_max_tokens.is_finite() && model_max_tokens > 0.0 {
        model_max_tokens.floor() as i64
    } else {
        1
    };
    let client_cap_tokens = client_cap_tokens
        .filter(|value| value.is_finite() && *value > 0.0)
        .map(|value| value.floor() as i64)
        .unwrap_or(DEFAULT_CONTEXT_WEIGHTED_CONFIG.client_cap_tokens);
    let warn_ratio = warn_ratio
        .filter(|value| value.is_finite() && *value > 0.0 && *value < 1.0)
        .unwrap_or(0.9);

    let effective_max = model_max_tokens.min(client_cap_tokens);
    let reserve = ((effective_max as f64) * (1.0 - warn_ratio)).ceil() as i64;
    let slack = (model_max_tokens - client_cap_tokens).max(0);
    let reserve_eff = (reserve - slack).max(0);
    (effective_max - reserve_eff).max(1)
}

pub fn compute_context_multiplier(
    effective_safe_ref_tokens: f64,
    effective_safe_tokens: f64,
    cfg: &ResolvedContextWeightedConfig,
) -> f64 {
    let reference = positive_floored_token_count(effective_safe_ref_tokens);
    let current = positive_floored_token_count(effective_safe_tokens);
    let ratio = reference as f64 / current as f64;
    let raw = ratio.max(1.0).powf(cfg.gamma);
    cfg.max_multiplier.min(raw)
}

fn positive_floored_token_count(value: f64) -> i64 {
    if value.is_finite() && value > 0.0 {
        (value.floor() as i64).max(1)
    } else {
        1
    }
}

#[cfg(test)]
mod tests {
    use super::{
        compute_context_multiplier, compute_effective_safe_window_tokens,
        resolve_context_weighted_config, ContextWeightedConfigInput,
        DEFAULT_CONTEXT_WEIGHTED_CONFIG,
    };

    #[test]
    fn resolves_defaults_and_valid_overrides() {
        assert_eq!(
            resolve_context_weighted_config(None),
            DEFAULT_CONTEXT_WEIGHTED_CONFIG
        );

        let resolved = resolve_context_weighted_config(Some(&ContextWeightedConfigInput {
            enabled: Some(true),
            client_cap_tokens: Some(1234.9),
            gamma: Some(1.5),
            max_multiplier: Some(3.0),
        }));
        assert!(resolved.enabled);
        assert_eq!(resolved.client_cap_tokens, 1234);
        assert_eq!(resolved.gamma, 1.5);
        assert_eq!(resolved.max_multiplier, 3.0);
    }

    #[test]
    fn invalid_config_values_fall_back_to_defaults() {
        let resolved = resolve_context_weighted_config(Some(&ContextWeightedConfigInput {
            enabled: None,
            client_cap_tokens: Some(0.0),
            gamma: Some(-1.0),
            max_multiplier: Some(0.5),
        }));
        assert_eq!(resolved, DEFAULT_CONTEXT_WEIGHTED_CONFIG);
    }

    #[test]
    fn computes_effective_safe_window_with_and_without_slack() {
        assert_eq!(
            compute_effective_safe_window_tokens(100_000.0, Some(0.9), Some(200_000.0)),
            90_000
        );
        assert_eq!(
            compute_effective_safe_window_tokens(500_000.0, Some(0.9), Some(200_000.0)),
            200_000
        );
    }

    #[test]
    fn effective_safe_window_uses_old_fallbacks() {
        assert_eq!(compute_effective_safe_window_tokens(0.0, None, None), 1);
        assert_eq!(
            compute_effective_safe_window_tokens(100.0, Some(1.5), Some(50.0)),
            50
        );
    }

    #[test]
    fn computes_context_multiplier_with_floor_and_cap() {
        let cfg = resolve_context_weighted_config(Some(&ContextWeightedConfigInput {
            enabled: Some(true),
            client_cap_tokens: Some(200_000.0),
            gamma: Some(2.0),
            max_multiplier: Some(3.0),
        }));
        assert_eq!(compute_context_multiplier(400.0, 100.0, &cfg), 3.0);
        assert_eq!(compute_context_multiplier(50.0, 100.0, &cfg), 1.0);
    }
}
