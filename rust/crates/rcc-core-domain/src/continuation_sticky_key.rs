#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ContinuationStickyScope {
    RequestChain,
    Session,
    Conversation,
    Request,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ContinuationStickyContext<'a> {
    pub request_id: &'a str,
    pub session_id: Option<&'a str>,
    pub conversation_id: Option<&'a str>,
    pub response_id: Option<&'a str>,
    pub previous_response_id: Option<&'a str>,
    pub continuation_chain_id: Option<&'a str>,
    pub sticky_scope: Option<ContinuationStickyScope>,
}

pub fn resolve_continuation_sticky_key(context: &ContinuationStickyContext<'_>) -> Option<String> {
    match context.sticky_scope {
        Some(ContinuationStickyScope::RequestChain) => context
            .continuation_chain_id
            .and_then(|value| trimmed_non_empty(Some(value)))
            .map(ToOwned::to_owned),
        Some(ContinuationStickyScope::Session) => context
            .session_id
            .and_then(|value| trimmed_non_empty(Some(value)))
            .map(|value| format!("session:{value}")),
        Some(ContinuationStickyScope::Conversation) => context
            .conversation_id
            .and_then(|value| trimmed_non_empty(Some(value)))
            .map(|value| format!("conversation:{value}")),
        Some(ContinuationStickyScope::Request) => {
            trimmed_non_empty(Some(context.request_id)).map(ToOwned::to_owned)
        }
        None => context
            .response_id
            .and_then(|value| trimmed_non_empty(Some(value)))
            .or_else(|| {
                context
                    .previous_response_id
                    .and_then(|value| trimmed_non_empty(Some(value)))
            })
            .map(ToOwned::to_owned),
    }
}

fn trimmed_non_empty(value: Option<&str>) -> Option<&str> {
    value.map(str::trim).filter(|value| !value.is_empty())
}

#[cfg(test)]
mod tests {
    use super::{
        resolve_continuation_sticky_key, ContinuationStickyContext, ContinuationStickyScope,
    };

    #[test]
    fn uses_continuation_request_chain_across_non_responses_protocols() {
        let key = resolve_continuation_sticky_key(&ContinuationStickyContext {
            request_id: "req_chat_1",
            session_id: Some("session_should_lose"),
            conversation_id: None,
            response_id: None,
            previous_response_id: None,
            continuation_chain_id: Some("chain_request_root_1"),
            sticky_scope: Some(ContinuationStickyScope::RequestChain),
        });

        assert_eq!(key.as_deref(), Some("chain_request_root_1"));
    }

    #[test]
    fn uses_continuation_session_scope_when_semantics_says_session() {
        let key = resolve_continuation_sticky_key(&ContinuationStickyContext {
            request_id: "req_anthropic_1",
            session_id: Some("session_scope_1"),
            conversation_id: Some("conversation_should_lose"),
            response_id: None,
            previous_response_id: None,
            continuation_chain_id: None,
            sticky_scope: Some(ContinuationStickyScope::Session),
        });

        assert_eq!(key.as_deref(), Some("session:session_scope_1"));
    }

    #[test]
    fn uses_continuation_conversation_scope_when_semantics_says_conversation() {
        let key = resolve_continuation_sticky_key(&ContinuationStickyContext {
            request_id: "req_gemini_1",
            session_id: None,
            conversation_id: Some("conversation_scope_1"),
            response_id: None,
            previous_response_id: None,
            continuation_chain_id: None,
            sticky_scope: Some(ContinuationStickyScope::Conversation),
        });

        assert_eq!(key.as_deref(), Some("conversation:conversation_scope_1"));
    }

    #[test]
    fn uses_request_scope_when_semantics_says_request() {
        let key = resolve_continuation_sticky_key(&ContinuationStickyContext {
            request_id: "req_scope_only_1",
            session_id: Some("session_should_not_win"),
            conversation_id: None,
            response_id: None,
            previous_response_id: None,
            continuation_chain_id: None,
            sticky_scope: Some(ContinuationStickyScope::Request),
        });

        assert_eq!(key.as_deref(), Some("req_scope_only_1"));
    }

    #[test]
    fn keeps_legacy_responses_resume_only_as_migration_fallback() {
        let key = resolve_continuation_sticky_key(&ContinuationStickyContext {
            request_id: "req_responses_legacy_1",
            session_id: Some("session_should_lose_to_legacy_chain"),
            conversation_id: None,
            response_id: None,
            previous_response_id: Some("req_chain_legacy_1"),
            continuation_chain_id: None,
            sticky_scope: None,
        });

        assert_eq!(key.as_deref(), Some("req_chain_legacy_1"));
    }
}
