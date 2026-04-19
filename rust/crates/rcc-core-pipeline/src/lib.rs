use rcc_core_domain::{
    build_hub_chat_process_request, lift_request_envelope_to_canonical,
    materialize_responses_continuation_fallback, normalize_hub_inbound_request,
    normalize_hub_outbound_request, prepare_responses_conversation_entry,
    record_responses_conversation_response, resolve_responses_continuation_owner,
    response_id_from_continuation_request, resume_responses_conversation,
    HubCanonicalOutboundRequest, HubCanonicalRequest, HubChatProcessRequest, HubInboundRequest,
    HubOutboundRequest, RequestEnvelope, ResponsesContinuationContext,
    ResponsesContinuationDecision, ResponsesConversationEntry,
};
use serde_json::Value;
use std::collections::{HashMap, VecDeque};
use std::sync::Mutex;

const MAX_STORED_RESPONSES: usize = 256;

#[derive(Debug, Default)]
struct ResponsesConversationStoreState {
    entries: HashMap<String, ResponsesConversationEntry>,
    order: VecDeque<String>,
}

impl ResponsesConversationStoreState {
    fn insert(&mut self, response_id: String, entry: ResponsesConversationEntry) {
        if !self.entries.contains_key(&response_id) {
            self.order.push_back(response_id.clone());
        }
        self.entries.insert(response_id, entry);

        while self.order.len() > MAX_STORED_RESPONSES {
            if let Some(oldest) = self.order.pop_front() {
                self.entries.remove(&oldest);
            }
        }
    }

    fn get_cloned(&self, response_id: &str) -> Option<ResponsesConversationEntry> {
        self.entries.get(response_id).cloned()
    }

    fn remove(&mut self, response_id: &str) {
        self.entries.remove(response_id);
        self.order.retain(|existing| existing != response_id);
    }
}

#[derive(Debug, Default)]
pub struct PipelineBlock {
    responses_store: Mutex<ResponsesConversationStoreState>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CanonicalChatProcessState {
    pub request: HubCanonicalRequest,
    pub continuation: ResponsesContinuationDecision,
}

pub type CanonicalOutboundCarrier = HubCanonicalOutboundRequest;

impl PipelineBlock {
    pub fn inbound(&self, request: RequestEnvelope) -> HubInboundRequest {
        normalize_hub_inbound_request(request)
    }

    pub fn chat_process(&self, inbound: &HubInboundRequest) -> HubChatProcessRequest {
        build_hub_chat_process_request(inbound)
    }

    pub fn outbound(&self, chat_process: &HubChatProcessRequest) -> HubOutboundRequest {
        normalize_hub_outbound_request(chat_process)
    }

    pub fn inbound_canonical(
        &self,
        request: RequestEnvelope,
    ) -> Result<HubCanonicalRequest, String> {
        lift_request_envelope_to_canonical(request).map_err(|error| error.to_string())
    }

    pub fn chat_process_canonical(
        &self,
        inbound: HubCanonicalRequest,
        continuation_context: ResponsesContinuationContext<'_>,
    ) -> Result<CanonicalChatProcessState, String> {
        let continuation = resolve_responses_continuation_owner(&continuation_context);
        let request = match continuation.owner {
            rcc_core_domain::ResponsesContinuationOwner::ChatProcessFallback => {
                self.restore_or_materialize_fallback(inbound)?
            }
            _ => inbound,
        };

        Ok(CanonicalChatProcessState {
            request,
            continuation,
        })
    }

    pub fn outbound_canonical(
        &self,
        state: CanonicalChatProcessState,
        target_provider_id: Option<&str>,
    ) -> CanonicalOutboundCarrier {
        HubCanonicalOutboundRequest {
            request: state.request,
            target_provider_id: target_provider_id.map(ToOwned::to_owned),
            continuation_owner: state.continuation.owner,
            protocol_mapping_audit: None,
        }
    }

    pub fn prepare(&self, request: RequestEnvelope) -> RequestEnvelope {
        let inbound = self.inbound(request);
        let chat_process = self.chat_process(&inbound);
        self.outbound(&chat_process).into_request_envelope()
    }

    pub fn remember_responses_conversation(
        &self,
        request: &HubCanonicalRequest,
        response_body: &Value,
    ) -> Result<Option<String>, String> {
        let mut entry = prepare_responses_conversation_entry(request);
        let response_id = record_responses_conversation_response(&mut entry, response_body)
            .map_err(|error| error.to_string())?;

        if let Some(response_id) = response_id.clone() {
            let mut store = self
                .responses_store
                .lock()
                .map_err(|_| "responses conversation store lock poisoned".to_string())?;
            store.insert(response_id, entry);
        }

        Ok(response_id)
    }

    fn restore_or_materialize_fallback(
        &self,
        inbound: HubCanonicalRequest,
    ) -> Result<HubCanonicalRequest, String> {
        let should_try_store_restore = !inbound.tool_results.is_empty()
            && !rcc_core_domain::canonical_messages_contain_tool_call(&inbound.messages);

        if should_try_store_restore {
            let response_id = response_id_from_continuation_request(&inbound)
                .map(str::to_string)
                .ok_or_else(|| "responses conversation restore requires response_id".to_string())?;
            let entry = {
                let store = self
                    .responses_store
                    .lock()
                    .map_err(|_| "responses conversation store lock poisoned".to_string())?;
                store.get_cloned(&response_id)
            }
            .ok_or_else(|| {
                format!("responses conversation `{response_id}` not found in pipeline store")
            })?;

            let restored = resume_responses_conversation(&entry, inbound)
                .map_err(|error| error.to_string())?;
            let mut store = self
                .responses_store
                .lock()
                .map_err(|_| "responses conversation store lock poisoned".to_string())?;
            store.remove(&response_id);
            return Ok(restored);
        }

        materialize_responses_continuation_fallback(inbound).map_err(|error| error.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::PipelineBlock;
    use rcc_core_domain::{RequestEnvelope, ResponsesContinuationOwner};
    use serde_json::json;

    #[test]
    fn inbound_applies_defaults_before_chat_process() {
        let block = PipelineBlock::default();
        let inbound = block.inbound(RequestEnvelope::new("", ""));

        assert_eq!(inbound.operation, "smoke");
        assert_eq!(inbound.payload, "phase2");
    }

    #[test]
    fn prepare_runs_inbound_chat_process_and_outbound_skeleton() {
        let block = PipelineBlock::default();
        let prepared = block.prepare(RequestEnvelope::new(
            "responses",
            r#"{"model":"gpt-5","input":"继续执行"}"#,
        ));

        assert_eq!(prepared.operation, "responses");
        assert_eq!(prepared.payload, r#"{"model":"gpt-5","input":"继续执行"}"#);
    }

    #[test]
    fn canonical_pipeline_prefers_provider_native_continuation_for_same_provider() {
        let block = PipelineBlock::default();
        let inbound = block
            .inbound_canonical(RequestEnvelope::new(
                "responses",
                r#"{"model":"claude-sonnet-4-5","previous_response_id":"resp-prev","input":"继续执行"}"#,
            ))
            .expect("canonical inbound");

        let state = block
            .chat_process_canonical(
                inbound,
                rcc_core_domain::ResponsesContinuationContext {
                    entry_endpoint: "/v1/responses",
                    inbound_provider_id: Some("openai"),
                    outbound_provider_id: Some("openai"),
                    provider_supports_native: true,
                    response_id: None,
                    previous_response_id: Some("resp-prev"),
                },
            )
            .expect("chat process state");
        let outbound = block.outbound_canonical(state, Some("openai"));

        assert_eq!(
            outbound.continuation_owner,
            ResponsesContinuationOwner::ProviderNative
        );
        assert_eq!(outbound.target_provider_id.as_deref(), Some("openai"));
        assert_eq!(outbound.request.model.as_deref(), Some("claude-sonnet-4-5"));
    }

    #[test]
    fn canonical_pipeline_falls_back_to_chat_process_for_submit_tool_outputs_when_native_unavailable(
    ) {
        let block = PipelineBlock::default();
        let inbound = block
            .inbound_canonical(RequestEnvelope::new(
                "responses",
                r#"{
                  "model":"claude-sonnet-4-5",
                  "response_id":"resp-prev",
                  "input":[
                    {"type":"message","role":"assistant","content":[
                      {"type":"function_call","call_id":"call_lookup_price","name":"lookup_price","arguments":"{\"ticker\":\"AAPL\"}"}
                    ]}
                  ],
                  "tool_outputs":[
                    {"tool_call_id":"call_lookup_price","output":"AAPL: 189.10"}
                  ]
                }"#,
            ))
            .expect("canonical inbound");

        let state = block
            .chat_process_canonical(
                inbound,
                rcc_core_domain::ResponsesContinuationContext {
                    entry_endpoint: "/v1/responses",
                    inbound_provider_id: Some("anthropic"),
                    outbound_provider_id: Some("anthropic"),
                    provider_supports_native: false,
                    response_id: Some("resp-prev"),
                    previous_response_id: None,
                },
            )
            .expect("chat process fallback state");
        let outbound = block.outbound_canonical(state, Some("anthropic"));

        assert_eq!(
            outbound.continuation_owner,
            ResponsesContinuationOwner::ChatProcessFallback
        );
        assert_eq!(outbound.target_provider_id.as_deref(), Some("anthropic"));
        assert!(outbound.request.response_id.is_none());
        assert_eq!(outbound.request.messages.len(), 2);
        assert_eq!(outbound.request.messages[1].role, "tool");
        assert_eq!(
            outbound.request.messages[1].content[0].data["tool_use_id"],
            "call_lookup_price"
        );
    }

    #[test]
    fn canonical_pipeline_returns_explicit_error_when_fallback_lacks_tool_call_context() {
        let block = PipelineBlock::default();
        let inbound = block
            .inbound_canonical(RequestEnvelope::new(
                "responses",
                r#"{
                  "model":"claude-sonnet-4-5",
                  "response_id":"resp-prev",
                  "tool_outputs":[
                    {"tool_call_id":"call_lookup_price","output":"AAPL: 189.10"}
                  ]
                }"#,
            ))
            .expect("canonical inbound");

        let error = block
            .chat_process_canonical(
                inbound,
                rcc_core_domain::ResponsesContinuationContext {
                    entry_endpoint: "/v1/responses.submit_tool_outputs",
                    inbound_provider_id: Some("anthropic"),
                    outbound_provider_id: Some("anthropic"),
                    provider_supports_native: false,
                    response_id: Some("resp-prev"),
                    previous_response_id: None,
                },
            )
            .expect_err("fallback without tool call context must fail");

        assert!(error.contains("not found in pipeline store"));
    }

    #[test]
    fn canonical_pipeline_restores_submit_tool_outputs_from_response_id_store() {
        let block = PipelineBlock::default();
        let create_request = block
            .inbound_canonical(RequestEnvelope::new(
                "responses",
                r#"{"model":"claude-sonnet-4-5","input":"查询股价"}"#,
            ))
            .expect("create request");
        block
            .remember_responses_conversation(
                &create_request,
                &json!({
                    "id": "resp_store_1",
                    "output": [{
                        "type": "function_call",
                        "call_id": "call_lookup_price",
                        "name": "lookup_price",
                        "arguments": "{\"ticker\":\"AAPL\"}"
                    }]
                }),
            )
            .expect("remember response");

        let submit_request = block
            .inbound_canonical(RequestEnvelope::new(
                "responses",
                r#"{
                  "model":"claude-sonnet-4-5",
                  "response_id":"resp_store_1",
                  "tool_outputs":[
                    {"tool_call_id":"call_lookup_price","output":"AAPL: 189.10"}
                  ]
                }"#,
            ))
            .expect("submit request");

        let state = block
            .chat_process_canonical(
                submit_request,
                rcc_core_domain::ResponsesContinuationContext {
                    entry_endpoint: "/v1/responses.submit_tool_outputs",
                    inbound_provider_id: Some("anthropic"),
                    outbound_provider_id: Some("anthropic"),
                    provider_supports_native: false,
                    response_id: Some("resp_store_1"),
                    previous_response_id: None,
                },
            )
            .expect("restored submit");

        assert_eq!(
            state.continuation.owner,
            ResponsesContinuationOwner::ChatProcessFallback
        );
        assert_eq!(state.request.messages.len(), 3);
        assert_eq!(state.request.messages[1].role, "assistant");
        assert_eq!(state.request.messages[2].role, "tool");
        assert_eq!(
            state.request.messages[2].content[0].data["tool_use_id"],
            "call_lookup_price"
        );
    }

    #[test]
    fn canonical_pipeline_returns_explicit_error_for_unknown_response_id_restore() {
        let block = PipelineBlock::default();
        let submit_request = block
            .inbound_canonical(RequestEnvelope::new(
                "responses",
                r#"{
                  "model":"claude-sonnet-4-5",
                  "response_id":"resp_missing",
                  "tool_outputs":[
                    {"tool_call_id":"call_lookup_price","output":"AAPL: 189.10"}
                  ]
                }"#,
            ))
            .expect("submit request");

        let error = block
            .chat_process_canonical(
                submit_request,
                rcc_core_domain::ResponsesContinuationContext {
                    entry_endpoint: "/v1/responses.submit_tool_outputs",
                    inbound_provider_id: Some("anthropic"),
                    outbound_provider_id: Some("anthropic"),
                    provider_supports_native: false,
                    response_id: Some("resp_missing"),
                    previous_response_id: None,
                },
            )
            .expect_err("unknown response id must fail");

        assert!(error.contains("not found in pipeline store"));
    }
}
