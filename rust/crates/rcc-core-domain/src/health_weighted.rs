#[derive(Debug, Clone, PartialEq)]
pub struct HealthWeightedConfigInput {
    pub enabled: Option<bool>,
    pub base_weight: Option<f64>,
    pub min_multiplier: Option<f64>,
    pub beta: Option<f64>,
    pub half_life_ms: Option<f64>,
    pub recover_to_best_on_retry: Option<bool>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ResolvedHealthWeightedConfig {
    pub enabled: bool,
    pub base_weight: i64,
    pub min_multiplier: f64,
    pub beta: f64,
    pub half_life_ms: i64,
    pub recover_to_best_on_retry: bool,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ProviderQuotaViewEntryLite {
    pub last_error_at_ms: Option<f64>,
    pub consecutive_error_count: Option<f64>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct HealthWeightResult {
    pub weight: i64,
    pub multiplier: f64,
}

pub const DEFAULT_HEALTH_WEIGHTED_CONFIG: ResolvedHealthWeightedConfig =
    ResolvedHealthWeightedConfig {
        enabled: false,
        base_weight: 100,
        min_multiplier: 0.5,
        beta: 0.1,
        half_life_ms: 10 * 60 * 1000,
        recover_to_best_on_retry: true,
    };

pub fn resolve_health_weighted_config(
    raw: Option<&HealthWeightedConfigInput>,
) -> ResolvedHealthWeightedConfig {
    let enabled = raw
        .and_then(|value| value.enabled)
        .unwrap_or(DEFAULT_HEALTH_WEIGHTED_CONFIG.enabled);
    let base_weight = raw
        .and_then(|value| value.base_weight)
        .filter(|value| value.is_finite() && *value > 0.0)
        .map(|value| value.floor() as i64)
        .unwrap_or(DEFAULT_HEALTH_WEIGHTED_CONFIG.base_weight);
    let min_multiplier = raw
        .and_then(|value| value.min_multiplier)
        .filter(|value| value.is_finite() && *value > 0.0)
        .map(|value| value.min(1.0))
        .unwrap_or(DEFAULT_HEALTH_WEIGHTED_CONFIG.min_multiplier);
    let beta = raw
        .and_then(|value| value.beta)
        .filter(|value| value.is_finite() && *value >= 0.0)
        .unwrap_or(DEFAULT_HEALTH_WEIGHTED_CONFIG.beta);
    let half_life_ms = raw
        .and_then(|value| value.half_life_ms)
        .filter(|value| value.is_finite() && *value > 0.0)
        .map(|value| value.floor() as i64)
        .unwrap_or(DEFAULT_HEALTH_WEIGHTED_CONFIG.half_life_ms);
    let recover_to_best_on_retry = raw
        .and_then(|value| value.recover_to_best_on_retry)
        .unwrap_or(DEFAULT_HEALTH_WEIGHTED_CONFIG.recover_to_best_on_retry);

    ResolvedHealthWeightedConfig {
        enabled,
        base_weight,
        min_multiplier,
        beta,
        half_life_ms,
        recover_to_best_on_retry,
    }
}

pub fn compute_health_multiplier(
    entry: Option<&ProviderQuotaViewEntryLite>,
    now_ms: f64,
    cfg: &ResolvedHealthWeightedConfig,
) -> f64 {
    let Some(entry) = entry else {
        return 1.0;
    };

    let last_error_at_ms = entry.last_error_at_ms.filter(|value| value.is_finite());
    let consecutive_error_count = entry
        .consecutive_error_count
        .filter(|value| value.is_finite() && *value > 0.0)
        .map(|value| value.floor() as i64)
        .unwrap_or(0);

    let Some(last_error_at_ms) = last_error_at_ms else {
        return 1.0;
    };
    if last_error_at_ms == 0.0 || consecutive_error_count <= 0 {
        return 1.0;
    }

    let elapsed_ms = (now_ms - last_error_at_ms).max(0.0);
    let decay = ((-(2.0_f64).ln()) * elapsed_ms / cfg.half_life_ms as f64).exp();
    let effective_errors = consecutive_error_count as f64 * decay;
    let raw = 1.0 - cfg.beta * effective_errors;
    raw.min(1.0).max(cfg.min_multiplier)
}

pub fn compute_health_weight(
    entry: Option<&ProviderQuotaViewEntryLite>,
    now_ms: f64,
    cfg: &ResolvedHealthWeightedConfig,
) -> HealthWeightResult {
    let multiplier = compute_health_multiplier(entry, now_ms, cfg);
    let weight = ((cfg.base_weight as f64) * multiplier).round() as i64;
    HealthWeightResult {
        weight: weight.max(1),
        multiplier,
    }
}

#[cfg(test)]
mod tests {
    use super::{
        compute_health_multiplier, compute_health_weight, resolve_health_weighted_config,
        HealthWeightedConfigInput, ProviderQuotaViewEntryLite, DEFAULT_HEALTH_WEIGHTED_CONFIG,
    };

    fn approx_eq(left: f64, right: f64) {
        assert!((left - right).abs() < 1e-9, "left={left} right={right}");
    }

    #[test]
    fn resolves_defaults_and_valid_overrides() {
        assert_eq!(
            resolve_health_weighted_config(None),
            DEFAULT_HEALTH_WEIGHTED_CONFIG
        );

        let resolved = resolve_health_weighted_config(Some(&HealthWeightedConfigInput {
            enabled: Some(true),
            base_weight: Some(123.9),
            min_multiplier: Some(0.25),
            beta: Some(0.2),
            half_life_ms: Some(1000.9),
            recover_to_best_on_retry: Some(false),
        }));
        assert!(resolved.enabled);
        assert_eq!(resolved.base_weight, 123);
        approx_eq(resolved.min_multiplier, 0.25);
        approx_eq(resolved.beta, 0.2);
        assert_eq!(resolved.half_life_ms, 1000);
        assert!(!resolved.recover_to_best_on_retry);
    }

    #[test]
    fn invalid_config_values_fall_back_to_defaults_or_clamp() {
        let resolved = resolve_health_weighted_config(Some(&HealthWeightedConfigInput {
            enabled: None,
            base_weight: Some(0.0),
            min_multiplier: Some(3.0),
            beta: Some(-1.0),
            half_life_ms: Some(0.0),
            recover_to_best_on_retry: None,
        }));
        assert_eq!(
            resolved.base_weight,
            DEFAULT_HEALTH_WEIGHTED_CONFIG.base_weight
        );
        approx_eq(resolved.min_multiplier, 1.0);
        approx_eq(resolved.beta, DEFAULT_HEALTH_WEIGHTED_CONFIG.beta);
        assert_eq!(
            resolved.half_life_ms,
            DEFAULT_HEALTH_WEIGHTED_CONFIG.half_life_ms
        );
        assert_eq!(
            resolved.recover_to_best_on_retry,
            DEFAULT_HEALTH_WEIGHTED_CONFIG.recover_to_best_on_retry
        );
    }

    #[test]
    fn health_multiplier_returns_one_for_missing_or_inactive_entry() {
        let cfg = resolve_health_weighted_config(None);
        approx_eq(compute_health_multiplier(None, 1000.0, &cfg), 1.0);
        approx_eq(
            compute_health_multiplier(
                Some(&ProviderQuotaViewEntryLite {
                    last_error_at_ms: Some(0.0),
                    consecutive_error_count: Some(3.0),
                }),
                1000.0,
                &cfg,
            ),
            1.0,
        );
        approx_eq(
            compute_health_multiplier(
                Some(&ProviderQuotaViewEntryLite {
                    last_error_at_ms: Some(100.0),
                    consecutive_error_count: Some(0.0),
                }),
                1000.0,
                &cfg,
            ),
            1.0,
        );
    }

    #[test]
    fn health_multiplier_applies_decay_and_clamp() {
        let cfg = resolve_health_weighted_config(Some(&HealthWeightedConfigInput {
            enabled: Some(true),
            base_weight: Some(100.0),
            min_multiplier: Some(0.5),
            beta: Some(0.1),
            half_life_ms: Some(1000.0),
            recover_to_best_on_retry: Some(true),
        }));
        let multiplier = compute_health_multiplier(
            Some(&ProviderQuotaViewEntryLite {
                last_error_at_ms: Some(1000.0),
                consecutive_error_count: Some(4.0),
            }),
            2000.0,
            &cfg,
        );
        approx_eq(multiplier, 0.8);

        let clamped = compute_health_multiplier(
            Some(&ProviderQuotaViewEntryLite {
                last_error_at_ms: Some(1000.0),
                consecutive_error_count: Some(20.0),
            }),
            1000.0,
            &cfg,
        );
        approx_eq(clamped, 0.5);
    }

    #[test]
    fn health_weight_rounds_and_has_min_one() {
        let cfg = resolve_health_weighted_config(Some(&HealthWeightedConfigInput {
            enabled: Some(true),
            base_weight: Some(3.0),
            min_multiplier: Some(0.2),
            beta: Some(0.0),
            half_life_ms: Some(1000.0),
            recover_to_best_on_retry: Some(true),
        }));
        let result = compute_health_weight(
            Some(&ProviderQuotaViewEntryLite {
                last_error_at_ms: Some(1000.0),
                consecutive_error_count: Some(5.0),
            }),
            1000.0,
            &cfg,
        );
        assert_eq!(result.weight, 3);
        approx_eq(result.multiplier, 1.0);
    }
}
