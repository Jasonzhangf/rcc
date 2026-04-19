use crate::RequestEnvelope;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HubInboundRequest {
    pub operation: String,
    pub payload: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HubChatProcessRequest {
    pub operation: String,
    pub payload: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HubOutboundRequest {
    pub operation: String,
    pub payload: String,
}

impl HubOutboundRequest {
    pub fn into_request_envelope(self) -> RequestEnvelope {
        RequestEnvelope::new(self.operation, self.payload)
    }
}

pub fn normalize_hub_inbound_request(request: RequestEnvelope) -> HubInboundRequest {
    let operation = request.operation.trim();
    let payload = request.payload.trim();

    HubInboundRequest {
        operation: if operation.is_empty() {
            "smoke".to_string()
        } else {
            operation.to_string()
        },
        payload: if payload.is_empty() {
            "phase2".to_string()
        } else {
            payload.to_string()
        },
    }
}

pub fn build_hub_chat_process_request(inbound: &HubInboundRequest) -> HubChatProcessRequest {
    HubChatProcessRequest {
        operation: inbound.operation.clone(),
        payload: inbound.payload.clone(),
    }
}

pub fn normalize_hub_outbound_request(chat_process: &HubChatProcessRequest) -> HubOutboundRequest {
    HubOutboundRequest {
        operation: chat_process.operation.clone(),
        payload: chat_process.payload.clone(),
    }
}

#[cfg(test)]
mod tests {
    use super::{
        build_hub_chat_process_request, normalize_hub_inbound_request,
        normalize_hub_outbound_request,
    };
    use crate::RequestEnvelope;

    #[test]
    fn normalize_hub_inbound_request_applies_trim_and_defaults() {
        let inbound = normalize_hub_inbound_request(RequestEnvelope::new("   ", "   "));

        assert_eq!(inbound.operation, "smoke");
        assert_eq!(inbound.payload, "phase2");
    }

    #[test]
    fn build_hub_chat_process_request_preserves_responses_payload() {
        let inbound = normalize_hub_inbound_request(RequestEnvelope::new(
            "responses",
            r#"{"model":"gpt-5","input":"继续执行"}"#,
        ));

        let chat_process = build_hub_chat_process_request(&inbound);

        assert_eq!(chat_process.operation, "responses");
        assert_eq!(
            chat_process.payload,
            r#"{"model":"gpt-5","input":"继续执行"}"#
        );
    }

    #[test]
    fn normalize_hub_outbound_request_round_trips_back_to_request_envelope() {
        let inbound = normalize_hub_inbound_request(RequestEnvelope::new("chat", "{}"));
        let chat_process = build_hub_chat_process_request(&inbound);
        let outbound = normalize_hub_outbound_request(&chat_process);
        let request = outbound.into_request_envelope();

        assert_eq!(request.operation, "chat");
        assert_eq!(request.payload, "{}");
    }
}
