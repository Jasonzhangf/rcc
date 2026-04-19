pub fn resolve_responses_target_provider(
    preferred_provider: Option<&str>,
    selected_target: Option<&str>,
    model: Option<&str>,
) -> &'static str {
    if let Some(provider) = normalize_provider_hint(preferred_provider) {
        return provider;
    }

    if let Some(target) = selected_target
        .map(str::trim)
        .filter(|target| !target.is_empty())
    {
        if let Some(provider) = normalize_provider_hint(Some(
            target
                .split_once('.')
                .map(|(provider_id, _)| provider_id)
                .unwrap_or(target),
        )) {
            return provider;
        }
    }

    if let Some(model) = model.map(str::trim).filter(|model| !model.is_empty()) {
        let normalized = model.to_ascii_lowercase();
        if normalized.starts_with("claude") {
            return "anthropic";
        }
        if normalized.starts_with("gpt-")
            || normalized.starts_with("o1")
            || normalized.starts_with("o3")
            || normalized.starts_with("o4")
        {
            return "responses";
        }
    }

    "responses"
}

fn normalize_provider_hint(provider: Option<&str>) -> Option<&'static str> {
    let provider = provider
        .map(str::trim)
        .filter(|provider| !provider.is_empty())?
        .to_ascii_lowercase();

    match provider.as_str() {
        "anthropic" => Some("anthropic"),
        "openai" | "responses" | "openai-standard" => Some("responses"),
        "gemini" => Some("gemini"),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::resolve_responses_target_provider;

    #[test]
    fn prefers_explicit_provider_hint_over_target_or_model_heuristics() {
        assert_eq!(
            resolve_responses_target_provider(
                Some("anthropic"),
                Some("beta.vision.gpt-4o"),
                Some("gpt-5"),
            ),
            "anthropic"
        );
    }

    #[test]
    fn resolves_known_provider_prefix_from_selected_target() {
        assert_eq!(
            resolve_responses_target_provider(None, Some("anthropic.ops.claude-3"), None),
            "anthropic"
        );
        assert_eq!(
            resolve_responses_target_provider(None, Some("openai.primary.gpt-5"), None),
            "responses"
        );
    }

    #[test]
    fn falls_back_to_model_family_when_selected_target_is_alias() {
        assert_eq!(
            resolve_responses_target_provider(None, Some("beta.vision.gpt-4o"), Some("gpt-5")),
            "responses"
        );
        assert_eq!(
            resolve_responses_target_provider(
                None,
                Some("alias.claude"),
                Some("claude-sonnet-4-5"),
            ),
            "anthropic"
        );
    }

    #[test]
    fn defaults_to_responses_when_no_hint_is_available() {
        assert_eq!(
            resolve_responses_target_provider(None, None, None),
            "responses"
        );
    }
}
