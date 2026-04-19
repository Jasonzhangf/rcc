#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ResponsesContinuationContext<'a> {
    pub entry_endpoint: &'a str,
    pub inbound_provider_id: Option<&'a str>,
    pub outbound_provider_id: Option<&'a str>,
    pub provider_supports_native: bool,
    pub response_id: Option<&'a str>,
    pub previous_response_id: Option<&'a str>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ResponsesContinuationOwner {
    None,
    ProviderNative,
    ChatProcessFallback,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ResponsesContinuationDecision {
    pub owner: ResponsesContinuationOwner,
    pub reason: &'static str,
}

pub fn provider_supports_native_responses_continuation(provider_id: Option<&str>) -> bool {
    matches!(
        trimmed_non_empty(provider_id),
        Some("responses" | "openai" | "openai-standard")
    )
}

pub fn resolve_responses_continuation_owner(
    context: &ResponsesContinuationContext<'_>,
) -> ResponsesContinuationDecision {
    let has_continuation_signal =
        has_non_empty(context.response_id) || has_non_empty(context.previous_response_id);

    if !has_continuation_signal {
        return ResponsesContinuationDecision {
            owner: ResponsesContinuationOwner::None,
            reason: "no continuation signal present",
        };
    }

    let same_provider =
        same_provider_chain(context.inbound_provider_id, context.outbound_provider_id);
    if same_provider && context.provider_supports_native {
        return ResponsesContinuationDecision {
            owner: ResponsesContinuationOwner::ProviderNative,
            reason: "same provider with native continuation support",
        };
    }

    ResponsesContinuationDecision {
        owner: ResponsesContinuationOwner::ChatProcessFallback,
        reason: "provider-native continuation unavailable for this request chain",
    }
}

fn same_provider_chain(
    inbound_provider_id: Option<&str>,
    outbound_provider_id: Option<&str>,
) -> bool {
    match (
        trimmed_non_empty(inbound_provider_id),
        trimmed_non_empty(outbound_provider_id),
    ) {
        (Some(inbound), Some(outbound)) => inbound == outbound,
        _ => false,
    }
}

fn has_non_empty(value: Option<&str>) -> bool {
    trimmed_non_empty(value).is_some()
}

fn trimmed_non_empty(value: Option<&str>) -> Option<&str> {
    value.map(str::trim).filter(|value| !value.is_empty())
}

#[cfg(test)]
mod tests {
    use super::{
        provider_supports_native_responses_continuation, resolve_responses_continuation_owner,
        ResponsesContinuationContext, ResponsesContinuationOwner,
    };

    #[test]
    fn provider_supports_native_responses_continuation_only_for_responses_like_targets() {
        assert!(provider_supports_native_responses_continuation(Some(
            "responses"
        )));
        assert!(provider_supports_native_responses_continuation(Some(
            "openai"
        )));
        assert!(provider_supports_native_responses_continuation(Some(
            "openai-standard"
        )));
        assert!(!provider_supports_native_responses_continuation(Some(
            "anthropic"
        )));
        assert!(!provider_supports_native_responses_continuation(None));
    }

    #[test]
    fn resolve_responses_continuation_owner_prefers_provider_native_when_supported() {
        let decision = resolve_responses_continuation_owner(&ResponsesContinuationContext {
            entry_endpoint: "/v1/responses.submit_tool_outputs",
            inbound_provider_id: Some("anthropic"),
            outbound_provider_id: Some("anthropic"),
            provider_supports_native: true,
            response_id: Some("resp-1"),
            previous_response_id: None,
        });

        assert_eq!(decision.owner, ResponsesContinuationOwner::ProviderNative);
    }

    #[test]
    fn resolve_responses_continuation_owner_falls_back_to_chat_process_for_cross_provider() {
        let decision = resolve_responses_continuation_owner(&ResponsesContinuationContext {
            entry_endpoint: "/v1/responses",
            inbound_provider_id: Some("openai"),
            outbound_provider_id: Some("anthropic"),
            provider_supports_native: true,
            response_id: None,
            previous_response_id: Some("resp-prev"),
        });

        assert_eq!(
            decision.owner,
            ResponsesContinuationOwner::ChatProcessFallback
        );
    }

    #[test]
    fn resolve_responses_continuation_owner_returns_none_without_signal() {
        let decision = resolve_responses_continuation_owner(&ResponsesContinuationContext {
            entry_endpoint: "/v1/responses",
            inbound_provider_id: Some("openai"),
            outbound_provider_id: Some("openai"),
            provider_supports_native: true,
            response_id: None,
            previous_response_id: None,
        });

        assert_eq!(decision.owner, ResponsesContinuationOwner::None);
    }
}
