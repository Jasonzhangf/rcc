use std::collections::BTreeMap;

pub const DEFAULT_MODEL_CONTEXT_TOKENS: f64 = 200_000.0;
pub const DEFAULT_WARN_RATIO: f64 = 0.9;

#[derive(Debug, Clone, PartialEq)]
pub struct ContextRoutingConfigInput {
    pub warn_ratio: Option<f64>,
    pub hard_limit: Option<bool>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ResolvedContextRoutingConfig {
    pub warn_ratio: f64,
    pub hard_limit: bool,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ProviderContextLimit {
    pub provider_key: String,
    pub max_context_tokens: Option<f64>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ContextUsageSnapshot {
    pub ratio: f64,
    pub limit: f64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ContextAdvisorResult {
    pub safe: Vec<String>,
    pub risky: Vec<String>,
    pub overflow: Vec<String>,
    pub usage: BTreeMap<String, ContextUsageSnapshot>,
    pub estimated_tokens: f64,
    pub all_overflow: bool,
}

pub fn resolve_context_routing_config(
    raw: Option<&ContextRoutingConfigInput>,
) -> ResolvedContextRoutingConfig {
    let warn_ratio = raw
        .and_then(|value| value.warn_ratio)
        .filter(|value| value.is_finite())
        .map(clamp_warn_ratio)
        .unwrap_or(DEFAULT_WARN_RATIO);
    let hard_limit = raw.and_then(|value| value.hard_limit).unwrap_or(false);
    ResolvedContextRoutingConfig {
        warn_ratio,
        hard_limit,
    }
}

pub fn classify_context_pool(
    pool: &[String],
    estimated_tokens: f64,
    provider_limits: &[ProviderContextLimit],
    cfg: &ResolvedContextRoutingConfig,
) -> ContextAdvisorResult {
    let normalized_tokens = if estimated_tokens.is_finite() && estimated_tokens > 0.0 {
        estimated_tokens
    } else {
        0.0
    };

    let mut safe = Vec::new();
    let mut risky = Vec::new();
    let mut overflow = Vec::new();
    let mut usage = BTreeMap::new();

    for provider_key in pool {
        let limit = resolve_provider_context_limit(provider_key, provider_limits);
        let ratio = if limit > 0.0 {
            normalized_tokens / limit
        } else {
            0.0
        };
        usage.insert(provider_key.clone(), ContextUsageSnapshot { ratio, limit });

        if normalized_tokens == 0.0 || ratio < cfg.warn_ratio {
            safe.push(provider_key.clone());
            continue;
        }
        if ratio < 1.0 {
            risky.push(provider_key.clone());
            continue;
        }
        overflow.push(provider_key.clone());
    }

    ContextAdvisorResult {
        safe,
        risky,
        overflow: overflow.clone(),
        usage,
        estimated_tokens: normalized_tokens,
        all_overflow: normalized_tokens > 0.0 && overflow.len() > 0 && pool.len() == overflow.len(),
    }
}

fn resolve_provider_context_limit(
    provider_key: &str,
    provider_limits: &[ProviderContextLimit],
) -> f64 {
    provider_limits
        .iter()
        .find(|entry| entry.provider_key == provider_key)
        .and_then(|entry| entry.max_context_tokens)
        .filter(|value| value.is_finite() && *value > 0.0)
        .unwrap_or(DEFAULT_MODEL_CONTEXT_TOKENS)
}

fn clamp_warn_ratio(value: f64) -> f64 {
    value.clamp(0.1, 0.99)
}

#[cfg(test)]
mod tests {
    use super::{
        classify_context_pool, resolve_context_routing_config, ContextRoutingConfigInput,
        ProviderContextLimit, DEFAULT_MODEL_CONTEXT_TOKENS, DEFAULT_WARN_RATIO,
    };

    fn approx_eq(left: f64, right: f64) {
        assert!((left - right).abs() < 1e-9, "left={left} right={right}");
    }

    #[test]
    fn resolves_config_with_clamp_and_defaults() {
        let defaulted = resolve_context_routing_config(None);
        approx_eq(defaulted.warn_ratio, DEFAULT_WARN_RATIO);
        assert!(!defaulted.hard_limit);

        let clamped = resolve_context_routing_config(Some(&ContextRoutingConfigInput {
            warn_ratio: Some(2.0),
            hard_limit: Some(true),
        }));
        approx_eq(clamped.warn_ratio, 0.99);
        assert!(clamped.hard_limit);

        let lowered = resolve_context_routing_config(Some(&ContextRoutingConfigInput {
            warn_ratio: Some(0.01),
            hard_limit: Some(false),
        }));
        approx_eq(lowered.warn_ratio, 0.1);
    }

    #[test]
    fn classify_uses_default_limits_for_missing_or_invalid_entries() {
        let pool = vec!["a".to_string(), "b".to_string(), "c".to_string()];
        let limits = vec![
            ProviderContextLimit {
                provider_key: "a".to_string(),
                max_context_tokens: Some(1000.0),
            },
            ProviderContextLimit {
                provider_key: "b".to_string(),
                max_context_tokens: Some(0.0),
            },
        ];
        let result =
            classify_context_pool(&pool, 100.0, &limits, &resolve_context_routing_config(None));
        approx_eq(result.usage["a"].limit, 1000.0);
        approx_eq(result.usage["b"].limit, DEFAULT_MODEL_CONTEXT_TOKENS);
        approx_eq(result.usage["c"].limit, DEFAULT_MODEL_CONTEXT_TOKENS);
    }

    #[test]
    fn zero_or_invalid_estimated_tokens_keeps_all_safe() {
        let pool = vec!["a".to_string(), "b".to_string()];
        let result = classify_context_pool(&pool, -1.0, &[], &resolve_context_routing_config(None));
        assert_eq!(result.safe, pool);
        assert!(result.risky.is_empty());
        assert!(result.overflow.is_empty());
        assert!(!result.all_overflow);
        approx_eq(result.estimated_tokens, 0.0);
    }

    #[test]
    fn classify_splits_safe_risky_and_overflow() {
        let pool = vec![
            "safe".to_string(),
            "risky".to_string(),
            "overflow".to_string(),
        ];
        let limits = vec![
            ProviderContextLimit {
                provider_key: "safe".to_string(),
                max_context_tokens: Some(1000.0),
            },
            ProviderContextLimit {
                provider_key: "risky".to_string(),
                max_context_tokens: Some(500.0),
            },
            ProviderContextLimit {
                provider_key: "overflow".to_string(),
                max_context_tokens: Some(200.0),
            },
        ];
        let cfg = resolve_context_routing_config(Some(&ContextRoutingConfigInput {
            warn_ratio: Some(0.9),
            hard_limit: Some(false),
        }));
        let result = classify_context_pool(&pool, 300.0, &limits, &cfg);
        assert_eq!(result.safe, vec!["safe", "risky"]);
        assert!(result.risky.is_empty());
        assert_eq!(result.overflow, vec!["overflow"]);
        assert!(!result.all_overflow);
    }

    #[test]
    fn all_overflow_requires_every_provider_to_overflow() {
        let pool = vec!["x".to_string(), "y".to_string()];
        let limits = vec![
            ProviderContextLimit {
                provider_key: "x".to_string(),
                max_context_tokens: Some(100.0),
            },
            ProviderContextLimit {
                provider_key: "y".to_string(),
                max_context_tokens: Some(200.0),
            },
        ];
        let result =
            classify_context_pool(&pool, 300.0, &limits, &resolve_context_routing_config(None));
        assert!(result.safe.is_empty());
        assert!(result.risky.is_empty());
        assert_eq!(result.overflow, pool);
        assert!(result.all_overflow);
    }
}
