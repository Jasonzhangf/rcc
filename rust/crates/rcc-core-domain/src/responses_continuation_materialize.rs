use crate::{
    HubCanonicalContentPart, HubCanonicalError, HubCanonicalMessage, HubCanonicalRequest,
    HubCanonicalToolResult,
};
use serde_json::{json, Value};

pub fn canonical_messages_contain_tool_call(messages: &[HubCanonicalMessage]) -> bool {
    messages.iter().any(|message| {
        message.content.iter().any(|part| {
            matches!(part.part_type.trim(), "tool_call" | "function_call")
                || part
                    .data
                    .as_object()
                    .and_then(|record| record.get("type"))
                    .and_then(Value::as_str)
                    .map(|kind| matches!(kind.trim(), "tool_call" | "function_call"))
                    .unwrap_or(false)
        })
    })
}

pub fn materialize_responses_continuation_fallback(
    mut request: HubCanonicalRequest,
) -> Result<HubCanonicalRequest, HubCanonicalError> {
    if request.tool_results.is_empty() {
        request.response_id = None;
        request.previous_response_id = None;
        return Ok(request);
    }

    if !canonical_messages_contain_tool_call(&request.messages) {
        return Err(HubCanonicalError::new(
            "responses continuation fallback requires materialized tool_call context before applying tool_outputs",
        ));
    }

    let tool_results = request.tool_results.clone();
    request
        .messages
        .push(build_tool_result_message(&tool_results));
    request.response_id = None;
    request.previous_response_id = None;
    Ok(request)
}

fn build_tool_result_message(tool_results: &[HubCanonicalToolResult]) -> HubCanonicalMessage {
    HubCanonicalMessage {
        role: "tool".to_string(),
        name: None,
        content: tool_results.iter().map(build_tool_result_part).collect(),
    }
}

fn build_tool_result_part(tool_result: &HubCanonicalToolResult) -> HubCanonicalContentPart {
    let text = tool_result.output.as_str().map(ToOwned::to_owned);

    HubCanonicalContentPart {
        part_type: "tool_result".to_string(),
        text,
        data: json!({
            "type": "tool_result",
            "tool_use_id": tool_result.tool_call_id,
            "tool_call_id": tool_result.tool_call_id,
            "content": tool_result.output,
            "is_error": tool_result.is_error,
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::{
        canonical_messages_contain_tool_call, materialize_responses_continuation_fallback,
    };
    use crate::{
        HubCanonicalContentPart, HubCanonicalMessage, HubCanonicalRequest,
        HubCanonicalToolDefinition, HubCanonicalToolResult,
    };
    use serde_json::{json, Map};

    fn canonical_request_with_tool_context() -> HubCanonicalRequest {
        HubCanonicalRequest {
            source_protocol: "openai-responses".to_string(),
            operation: "responses".to_string(),
            model: Some("claude-sonnet-4-5".to_string()),
            stream: None,
            response_id: Some("resp-1".to_string()),
            previous_response_id: None,
            messages: vec![HubCanonicalMessage {
                role: "assistant".to_string(),
                name: None,
                content: vec![HubCanonicalContentPart {
                    part_type: "function_call".to_string(),
                    text: None,
                    data: json!({
                        "type": "function_call",
                        "call_id": "call_lookup_price",
                        "name": "lookup_price",
                        "arguments": "{\"ticker\":\"AAPL\"}"
                    }),
                }],
            }],
            tools: vec![HubCanonicalToolDefinition {
                name: "lookup_price".to_string(),
                description: Some("查询股价".to_string()),
                parameters: json!({"type":"object"}),
                strict: None,
                raw: json!({}),
            }],
            tool_results: vec![HubCanonicalToolResult {
                tool_call_id: "call_lookup_price".to_string(),
                output: json!("AAPL: 189.10"),
                is_error: None,
                raw: json!({"tool_call_id":"call_lookup_price","output":"AAPL: 189.10"}),
            }],
            metadata: Map::new(),
            raw_payload_text: "{}".to_string(),
        }
    }

    #[test]
    fn canonical_messages_contain_tool_call_detects_function_call_parts() {
        let request = canonical_request_with_tool_context();
        assert!(canonical_messages_contain_tool_call(&request.messages));
    }

    #[test]
    fn materialize_responses_continuation_fallback_appends_tool_result_message() {
        let materialized =
            materialize_responses_continuation_fallback(canonical_request_with_tool_context())
                .expect("materialized");

        assert_eq!(materialized.messages.len(), 2);
        assert_eq!(materialized.messages[1].role, "tool");
        assert_eq!(materialized.messages[1].content[0].part_type, "tool_result");
        assert_eq!(
            materialized.messages[1].content[0].data["tool_use_id"],
            "call_lookup_price"
        );
        assert_eq!(
            materialized.messages[1].content[0].data["content"],
            "AAPL: 189.10"
        );
        assert!(materialized.response_id.is_none());
    }

    #[test]
    fn materialize_responses_continuation_fallback_fails_without_tool_call_context() {
        let mut request = canonical_request_with_tool_context();
        request.messages.clear();

        let error = materialize_responses_continuation_fallback(request).expect_err("must fail");

        assert!(error
            .to_string()
            .contains("requires materialized tool_call context"));
    }
}
