use crate::RequestEnvelope;
use crate::{responses_continuation_policy::ResponsesContinuationOwner, ProtocolMappingAudit};
use serde_json::{Map, Value};
use std::error::Error;
use std::fmt::{self, Display, Formatter};

pub const HUB_SOURCE_PROTOCOL_RESPONSES: &str = "openai-responses";

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HubCanonicalMessage {
    pub role: String,
    pub name: Option<String>,
    pub content: Vec<HubCanonicalContentPart>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HubCanonicalContentPart {
    pub part_type: String,
    pub text: Option<String>,
    pub data: Value,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HubCanonicalToolDefinition {
    pub name: String,
    pub description: Option<String>,
    pub parameters: Value,
    pub strict: Option<bool>,
    pub raw: Value,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HubCanonicalToolResult {
    pub tool_call_id: String,
    pub output: Value,
    pub is_error: Option<bool>,
    pub raw: Value,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HubCanonicalRequest {
    pub source_protocol: String,
    pub operation: String,
    pub model: Option<String>,
    pub stream: Option<bool>,
    pub response_id: Option<String>,
    pub previous_response_id: Option<String>,
    pub messages: Vec<HubCanonicalMessage>,
    pub tools: Vec<HubCanonicalToolDefinition>,
    pub tool_results: Vec<HubCanonicalToolResult>,
    pub metadata: Map<String, Value>,
    pub raw_payload_text: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HubCanonicalOutboundRequest {
    pub request: HubCanonicalRequest,
    pub target_provider_id: Option<String>,
    pub continuation_owner: ResponsesContinuationOwner,
    pub protocol_mapping_audit: Option<ProtocolMappingAudit>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HubCanonicalError {
    message: String,
}

impl HubCanonicalError {
    pub(crate) fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
        }
    }
}

impl Display for HubCanonicalError {
    fn fmt(&self, f: &mut Formatter<'_>) -> fmt::Result {
        f.write_str(&self.message)
    }
}

impl Error for HubCanonicalError {}

pub fn lift_request_envelope_to_canonical(
    request: RequestEnvelope,
) -> Result<HubCanonicalRequest, HubCanonicalError> {
    match request.operation.trim() {
        "" | "responses" => lift_responses_request_to_canonical(request),
        operation => Ok(HubCanonicalRequest {
            source_protocol: operation.to_string(),
            operation: operation.to_string(),
            model: None,
            stream: None,
            response_id: None,
            previous_response_id: None,
            messages: vec![HubCanonicalMessage {
                role: "user".to_string(),
                name: None,
                content: vec![HubCanonicalContentPart {
                    part_type: "text".to_string(),
                    text: (!request.payload.trim().is_empty()).then(|| request.payload.clone()),
                    data: Value::String(request.payload.clone()),
                }],
            }],
            tools: Vec::new(),
            tool_results: Vec::new(),
            metadata: Map::new(),
            raw_payload_text: request.payload,
        }),
    }
}

pub fn lift_responses_request_to_canonical(
    request: RequestEnvelope,
) -> Result<HubCanonicalRequest, HubCanonicalError> {
    let operation = if request.operation.trim().is_empty() {
        "responses".to_string()
    } else {
        request.operation
    };
    let raw_payload_text = request.payload;
    let payload = serde_json::from_str::<Value>(&raw_payload_text).map_err(|error| {
        HubCanonicalError::new(format!(
            "responses canonical lift requires JSON object payload: {error}"
        ))
    })?;
    let root = payload.as_object().ok_or_else(|| {
        HubCanonicalError::new("responses canonical lift requires top-level JSON object payload")
    })?;

    let model = read_trimmed_string(root, &["model"]);
    let stream = root.get("stream").and_then(Value::as_bool);
    let response_id = read_trimmed_string(root, &["response_id"]);
    let previous_response_id = read_trimmed_string(root, &["previous_response_id"]);
    let metadata = root
        .get("metadata")
        .and_then(Value::as_object)
        .cloned()
        .unwrap_or_default();
    let tools = extract_responses_tools(root.get("tools"));
    let tool_results = extract_responses_tool_results(root.get("tool_outputs"))?;
    let messages = extract_responses_messages(root.get("input"))?;

    Ok(HubCanonicalRequest {
        source_protocol: HUB_SOURCE_PROTOCOL_RESPONSES.to_string(),
        operation,
        model,
        stream,
        response_id,
        previous_response_id,
        messages,
        tools,
        tool_results,
        metadata,
        raw_payload_text,
    })
}

pub fn infer_responses_entry_endpoint(request: &HubCanonicalRequest) -> &'static str {
    if request.response_id.is_some() && !request.tool_results.is_empty() {
        "/v1/responses.submit_tool_outputs"
    } else {
        "/v1/responses"
    }
}

fn extract_responses_messages(
    input: Option<&Value>,
) -> Result<Vec<HubCanonicalMessage>, HubCanonicalError> {
    let Some(input) = input else {
        return Ok(Vec::new());
    };

    match input {
        Value::String(text) => Ok(vec![HubCanonicalMessage {
            role: "user".to_string(),
            name: None,
            content: vec![HubCanonicalContentPart {
                part_type: "input_text".to_string(),
                text: Some(text.clone()),
                data: Value::String(text.clone()),
            }],
        }]),
        Value::Array(items) => items.iter().map(extract_message_from_input_item).collect(),
        _ => Err(HubCanonicalError::new(
            "responses canonical lift requires `input` to be string or array",
        )),
    }
}

fn extract_message_from_input_item(item: &Value) -> Result<HubCanonicalMessage, HubCanonicalError> {
    let record = item.as_object().ok_or_else(|| {
        HubCanonicalError::new("responses canonical lift requires input array items to be objects")
    })?;

    let item_type = read_trimmed_string(record, &["type"]);
    let role = read_trimmed_string(record, &["role"]).unwrap_or_else(|| "user".to_string());
    let name = read_trimmed_string(record, &["name"]);

    if item_type.as_deref() == Some("message") || record.contains_key("content") {
        return Ok(HubCanonicalMessage {
            role,
            name,
            content: extract_content_parts(record.get("content"))?,
        });
    }

    Ok(HubCanonicalMessage {
        role,
        name,
        content: vec![extract_content_part(item)],
    })
}

fn extract_content_parts(
    content: Option<&Value>,
) -> Result<Vec<HubCanonicalContentPart>, HubCanonicalError> {
    let Some(content) = content else {
        return Ok(Vec::new());
    };

    match content {
        Value::String(text) => Ok(vec![HubCanonicalContentPart {
            part_type: "text".to_string(),
            text: Some(text.clone()),
            data: Value::String(text.clone()),
        }]),
        Value::Array(items) => Ok(items.iter().map(extract_content_part).collect()),
        Value::Object(_) => Ok(vec![extract_content_part(content)]),
        _ => Err(HubCanonicalError::new(
            "responses canonical lift requires message content to be string, object, or array",
        )),
    }
}

fn extract_content_part(value: &Value) -> HubCanonicalContentPart {
    let part_type = value
        .as_object()
        .and_then(|record| read_trimmed_string(record, &["type"]))
        .unwrap_or_else(|| "text".to_string());
    let text = value
        .as_object()
        .and_then(|record| {
            read_trimmed_string(record, &["text", "input_text", "output_text", "output"])
        })
        .or_else(|| value.as_str().map(ToOwned::to_owned));

    HubCanonicalContentPart {
        part_type,
        text,
        data: value.clone(),
    }
}

fn extract_responses_tools(tools: Option<&Value>) -> Vec<HubCanonicalToolDefinition> {
    tools
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|item| {
            let record = item.as_object()?;
            let function = record.get("function").and_then(Value::as_object)?;
            let name = read_trimmed_string(function, &["name"])?;
            Some(HubCanonicalToolDefinition {
                name,
                description: read_trimmed_string(function, &["description"]),
                parameters: function.get("parameters").cloned().unwrap_or(Value::Null),
                strict: function.get("strict").and_then(Value::as_bool),
                raw: item.clone(),
            })
        })
        .collect()
}

fn extract_responses_tool_results(
    tool_outputs: Option<&Value>,
) -> Result<Vec<HubCanonicalToolResult>, HubCanonicalError> {
    let Some(tool_outputs) = tool_outputs else {
        return Ok(Vec::new());
    };

    let outputs = tool_outputs.as_array().ok_or_else(|| {
        HubCanonicalError::new("responses canonical lift requires `tool_outputs` to be array")
    })?;

    outputs
        .iter()
        .map(|item| {
            let record = item.as_object().ok_or_else(|| {
                HubCanonicalError::new(
                    "responses canonical lift requires tool_outputs items to be objects",
                )
            })?;
            let tool_call_id =
                read_trimmed_string(record, &["tool_call_id", "call_id", "id"]).ok_or_else(
                    || {
                        HubCanonicalError::new(
                            "responses canonical lift requires tool_outputs items to include tool_call_id/call_id/id",
                        )
                    },
                )?;
            Ok(HubCanonicalToolResult {
                tool_call_id,
                output: record
                    .get("output")
                    .cloned()
                    .or_else(|| record.get("content").cloned())
                    .unwrap_or(Value::Null),
                is_error: record.get("is_error").and_then(Value::as_bool),
                raw: item.clone(),
            })
        })
        .collect()
}

fn read_trimmed_string(record: &Map<String, Value>, keys: &[&str]) -> Option<String> {
    keys.iter()
        .filter_map(|key| record.get(*key).and_then(Value::as_str))
        .map(str::trim)
        .find(|value| !value.is_empty())
        .map(ToOwned::to_owned)
}

#[cfg(test)]
mod tests {
    use super::{
        infer_responses_entry_endpoint, lift_request_envelope_to_canonical,
        lift_responses_request_to_canonical, HUB_SOURCE_PROTOCOL_RESPONSES,
    };
    use crate::RequestEnvelope;
    use serde_json::json;

    #[test]
    fn lift_responses_request_to_canonical_preserves_core_semantics() {
        let canonical = lift_responses_request_to_canonical(RequestEnvelope::new(
            "responses",
            json!({
                "model": "claude-sonnet-4-5",
                "stream": true,
                "previous_response_id": "resp-prev-1",
                "metadata": {
                    "conversation_id": "conv-1"
                },
                "tools": [{
                    "type": "function",
                    "function": {
                        "name": "exec_command",
                        "description": "run shell",
                        "parameters": {
                            "type": "object"
                        }
                    }
                }],
                "input": [{
                    "type": "message",
                    "role": "user",
                    "content": [{
                        "type": "input_text",
                        "text": "hello"
                    }]
                }]
            })
            .to_string(),
        ))
        .expect("canonical");

        assert_eq!(canonical.source_protocol, HUB_SOURCE_PROTOCOL_RESPONSES);
        assert_eq!(canonical.model.as_deref(), Some("claude-sonnet-4-5"));
        assert_eq!(canonical.stream, Some(true));
        assert_eq!(
            canonical.previous_response_id.as_deref(),
            Some("resp-prev-1")
        );
        assert_eq!(
            canonical.metadata.get("conversation_id"),
            Some(&json!("conv-1"))
        );
        assert_eq!(canonical.tools[0].name, "exec_command");
        assert_eq!(canonical.messages[0].role, "user");
        assert_eq!(canonical.messages[0].content[0].part_type, "input_text");
        assert_eq!(
            canonical.messages[0].content[0].text.as_deref(),
            Some("hello")
        );
        assert!(canonical.tool_results.is_empty());
    }

    #[test]
    fn lift_request_envelope_to_canonical_falls_back_for_non_responses_operation() {
        let canonical = lift_request_envelope_to_canonical(RequestEnvelope::new(
            "chat",
            r#"{"model":"gpt-5","messages":[]}"#,
        ))
        .expect("canonical");

        assert_eq!(canonical.source_protocol, "chat");
        assert_eq!(canonical.operation, "chat");
        assert_eq!(canonical.messages.len(), 1);
        assert_eq!(canonical.messages[0].role, "user");
        assert_eq!(
            canonical.raw_payload_text,
            r#"{"model":"gpt-5","messages":[]}"#
        );
        assert!(canonical.tool_results.is_empty());
    }

    #[test]
    fn lift_responses_request_to_canonical_rejects_non_object_payload() {
        let error =
            lift_responses_request_to_canonical(RequestEnvelope::new("responses", r#"[1,2,3]"#))
                .expect_err("must fail");

        assert!(error.to_string().contains("top-level JSON object payload"));
    }

    #[test]
    fn lift_responses_request_to_canonical_extracts_submit_tool_outputs_shape() {
        let canonical = lift_responses_request_to_canonical(RequestEnvelope::new(
            "responses",
            json!({
                "model": "claude-sonnet-4-5",
                "response_id": "resp-1",
                "input": [{
                    "type": "message",
                    "role": "assistant",
                    "content": [{
                        "type": "function_call",
                        "call_id": "call_lookup_price",
                        "name": "lookup_price",
                        "arguments": "{\"ticker\":\"AAPL\"}"
                    }]
                }],
                "tool_outputs": [{
                    "tool_call_id": "call_lookup_price",
                    "output": "AAPL: 189.10"
                }]
            })
            .to_string(),
        ))
        .expect("canonical");

        assert_eq!(canonical.response_id.as_deref(), Some("resp-1"));
        assert_eq!(canonical.tool_results.len(), 1);
        assert_eq!(canonical.tool_results[0].tool_call_id, "call_lookup_price");
        assert_eq!(canonical.tool_results[0].output, json!("AAPL: 189.10"));
        assert_eq!(
            infer_responses_entry_endpoint(&canonical),
            "/v1/responses.submit_tool_outputs"
        );
    }
}
