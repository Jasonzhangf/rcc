use rcc_core_domain::RouteDecision;
use rcc_core_domain::{
    build_canonical_response, build_provider_request_carrier,
    build_provider_request_carrier_from_canonical_outbound, normalize_compat_canonical_request,
    CompatCanonicalRequest, CompatCanonicalResponse, HubCanonicalOutboundRequest,
    ProviderRequestCarrier, ProviderResponseCarrier, RequestEnvelope,
};

#[derive(Debug, Default)]
pub struct CompatBlock;

impl CompatBlock {
    pub fn normalize_request(&self, request: &RequestEnvelope) -> CompatCanonicalRequest {
        normalize_compat_canonical_request(request)
    }

    pub fn map_request(
        &self,
        request: &RequestEnvelope,
        route: Option<&RouteDecision>,
    ) -> ProviderRequestCarrier {
        let canonical = self.normalize_request(request);
        build_provider_request_carrier(&canonical, route)
    }

    pub fn map_canonical_request(
        &self,
        outbound: &HubCanonicalOutboundRequest,
        route: Option<&RouteDecision>,
    ) -> Result<ProviderRequestCarrier, String> {
        build_provider_request_carrier_from_canonical_outbound(outbound, route)
            .map_err(|error| error.to_string())
    }

    pub fn map_response(&self, response: &ProviderResponseCarrier) -> CompatCanonicalResponse {
        build_canonical_response(response)
    }
}

#[cfg(test)]
mod tests {
    use super::CompatBlock;
    use rcc_core_domain::{
        extract_output_text, lift_responses_request_to_canonical, HubCanonicalOutboundRequest,
        ProviderResponseCarrier, RequestEnvelope, ResponsesContinuationOwner,
        ANTHROPIC_MESSAGES_OPERATION, GEMINI_CHAT_OPERATION,
    };
    use serde_json::{json, Value};

    #[test]
    fn map_request_builds_provider_request_carrier() {
        let block = CompatBlock::default();
        let carrier = block.map_request(
            &RequestEnvelope::new(
                "responses",
                r#"{"model":"gpt-5","input":"继续执行","metadata":{"trace_id":"phase8"}}"#,
            ),
            None,
        );

        assert_eq!(carrier.operation, "responses");
        assert_eq!(carrier.body["model"], "gpt-5");
        assert_eq!(carrier.body["input"], "继续执行");
        assert_eq!(carrier.metadata["trace_id"], "phase8");
        assert_eq!(carrier.route, None);
    }

    #[test]
    fn map_request_projects_route_handoff_sidecar() {
        let block = CompatBlock::default();
        let carrier = block.map_request(
            &RequestEnvelope::new("responses", r#"{"model":"gpt-5","input":"继续执行"}"#),
            Some(&rcc_core_domain::RouteDecision {
                target_block: "pipeline".to_string(),
                selected_route: Some("multimodal".to_string()),
                selected_target: Some("openai.vision.gpt-4o".to_string()),
                candidate_routes: vec!["multimodal".to_string()],
            }),
        );

        assert_eq!(
            carrier.route,
            Some(rcc_core_domain::ProviderRouteHandoff {
                selected_route: Some("multimodal".to_string()),
                selected_target: Some("openai.vision.gpt-4o".to_string()),
            })
        );
        assert!(carrier.body.get("route").is_none());
    }

    #[test]
    fn map_response_converts_provider_text_into_canonical_output() {
        let block = CompatBlock::default();
        let response = block.map_response(&ProviderResponseCarrier {
            runtime: "noop-runtime".to_string(),
            status: "completed".to_string(),
            body: json!({"text":"runtime=noop-runtime operation=responses"}),
            headers: json!({}),
            raw_stream_carrier: Value::Null,
        });

        assert_eq!(response.status, "completed");
        assert_eq!(response.raw_carrier["runtime"], "noop-runtime");
        assert_eq!(
            extract_output_text(&response),
            "runtime=noop-runtime operation=responses"
        );
    }

    #[test]
    fn map_canonical_request_projects_responses_to_anthropic_messages() {
        let block = CompatBlock::default();
        let outbound = HubCanonicalOutboundRequest {
            request: lift_responses_request_to_canonical(RequestEnvelope::new(
                "responses",
                r#"{
                  "model":"claude-sonnet-4-5",
                  "stream":true,
                  "metadata":{"trace_id":"phase9"},
                  "input":[{"type":"message","role":"user","content":[{"type":"input_text","text":"继续执行"}]}]
                }"#,
            ))
            .expect("canonical request"),
            target_provider_id: Some("anthropic".to_string()),
            continuation_owner: ResponsesContinuationOwner::ProviderNative,
            protocol_mapping_audit: None,
        };

        let carrier = block
            .map_canonical_request(&outbound, None)
            .expect("canonical provider carrier");

        assert_eq!(carrier.operation, ANTHROPIC_MESSAGES_OPERATION);
        assert_eq!(carrier.body["model"], "claude-sonnet-4-5");
        assert_eq!(carrier.body["messages"][0]["role"], "user");
        assert_eq!(
            carrier.body["messages"][0]["content"][0]["text"],
            "继续执行"
        );
        assert_eq!(carrier.body["stream"], true);
        assert_eq!(carrier.metadata["trace_id"], "phase9");
    }

    #[test]
    fn map_canonical_request_projects_responses_to_gemini_contents() {
        let block = CompatBlock::default();
        let outbound = HubCanonicalOutboundRequest {
            request: lift_responses_request_to_canonical(RequestEnvelope::new(
                "responses",
                r#"{
                  "model":"gemini-2.5-pro",
                  "metadata":{"trace_id":"phase8"},
                  "input":[
                    {"type":"message","role":"developer","content":[{"type":"input_text","text":"只回答 JSON"}]},
                    {"type":"message","role":"user","content":[{"type":"input_text","text":"继续执行"}]}
                  ]
                }"#,
            ))
            .expect("canonical request"),
            target_provider_id: Some("gemini".to_string()),
            continuation_owner: ResponsesContinuationOwner::ProviderNative,
            protocol_mapping_audit: None,
        };

        let carrier = block
            .map_canonical_request(&outbound, None)
            .expect("canonical provider carrier");

        assert_eq!(carrier.operation, GEMINI_CHAT_OPERATION);
        assert_eq!(carrier.body["systemInstruction"]["role"], "system");
        assert_eq!(
            carrier.body["systemInstruction"]["parts"][0]["text"],
            "只回答 JSON"
        );
        assert_eq!(carrier.body["contents"][0]["role"], "user");
        assert_eq!(carrier.body["contents"][0]["parts"][0]["text"], "继续执行");
        assert!(carrier.body.get("metadata").is_none());
        assert_eq!(carrier.metadata["trace_id"], "phase8");
    }
}
