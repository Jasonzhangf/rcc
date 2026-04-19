use crate::{
    materialize_responses_continuation_fallback, HubCanonicalContentPart, HubCanonicalError,
    HubCanonicalMessage, HubCanonicalRequest,
};
use serde_json::{Map, Value};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ResponsesConversationEntry {
    pub request: HubCanonicalRequest,
    pub last_response_id: Option<String>,
}

pub fn prepare_responses_conversation_entry(
    request: &HubCanonicalRequest,
) -> ResponsesConversationEntry {
    let mut stored = request.clone();
    stored.response_id = None;
    stored.previous_response_id = None;
    stored.tool_results.clear();

    ResponsesConversationEntry {
        request: stored,
        last_response_id: None,
    }
}

pub fn record_responses_conversation_response(
    entry: &mut ResponsesConversationEntry,
    response_body: &Value,
) -> Result<Option<String>, HubCanonicalError> {
    let response_id = read_response_id(response_body);
    let response_messages = extract_response_messages(response_body)?;
    let has_continuation_signal =
        !response_messages.is_empty() || has_required_action_tool_calls(response_body);

    if has_continuation_signal && response_id.is_none() {
        return Err(HubCanonicalError::new(
            "responses conversation record requires response body id when continuation signals are present",
        ));
    }

    if !response_messages.is_empty() {
        entry.request.messages.extend(response_messages);
    }

    entry.last_response_id = response_id.clone();
    Ok(response_id)
}

pub fn resume_responses_conversation(
    entry: &ResponsesConversationEntry,
    incoming: HubCanonicalRequest,
) -> Result<HubCanonicalRequest, HubCanonicalError> {
    let response_id = response_id_from_continuation_request(&incoming).ok_or_else(|| {
        HubCanonicalError::new(
            "responses conversation restore requires response_id or previous_response_id",
        )
    })?;

    if entry.last_response_id.as_deref() != Some(response_id) {
        return Err(HubCanonicalError::new(format!(
            "responses conversation `{response_id}` not found or mismatched"
        )));
    }

    if incoming.tool_results.is_empty() {
        return Err(HubCanonicalError::new(
            "responses conversation restore requires tool_outputs",
        ));
    }

    let mut restored = entry.request.clone();
    if incoming.model.is_some() {
        restored.model = incoming.model.clone();
    }
    if incoming.stream.is_some() {
        restored.stream = incoming.stream;
    }
    if !incoming.tools.is_empty() {
        restored.tools = incoming.tools.clone();
    }
    merge_metadata(&mut restored.metadata, &incoming.metadata);
    restored.response_id = incoming.response_id.clone();
    restored.previous_response_id = incoming.previous_response_id.clone();
    restored.tool_results = incoming.tool_results.clone();
    restored.raw_payload_text = incoming.raw_payload_text.clone();

    materialize_responses_continuation_fallback(restored)
}

pub fn response_id_from_continuation_request(request: &HubCanonicalRequest) -> Option<&str> {
    request
        .response_id
        .as_deref()
        .or(request.previous_response_id.as_deref())
        .map(str::trim)
        .filter(|value| !value.is_empty())
}

fn extract_response_messages(
    response_body: &Value,
) -> Result<Vec<HubCanonicalMessage>, HubCanonicalError> {
    let mut messages = Vec::new();
    let mut assistant_parts = Vec::new();

    if let Some(items) = response_body.get("output").and_then(Value::as_array) {
        for item in items {
            match item.get("type").and_then(Value::as_str).map(str::trim) {
                Some("message") => messages.push(extract_message_output(item)?),
                Some(_) | None => assistant_parts.push(extract_output_part(item)),
            }
        }
    }

    if assistant_parts.is_empty() {
        assistant_parts.extend(extract_required_action_parts(response_body)?);
    }

    if !assistant_parts.is_empty() {
        messages.push(HubCanonicalMessage {
            role: "assistant".to_string(),
            name: None,
            content: assistant_parts,
        });
    }

    Ok(messages)
}

fn extract_message_output(item: &Value) -> Result<HubCanonicalMessage, HubCanonicalError> {
    let record = item.as_object().ok_or_else(|| {
        HubCanonicalError::new("responses conversation message output must be object")
    })?;
    let role = read_trimmed_string(record, &["role"]).unwrap_or_else(|| "assistant".to_string());
    let name = read_trimmed_string(record, &["name"]);
    let content = match record.get("content") {
        Some(Value::Array(parts)) => parts.iter().map(extract_output_part).collect(),
        Some(Value::Object(part)) => vec![extract_output_part(&Value::Object(part.clone()))],
        Some(Value::String(text)) => vec![HubCanonicalContentPart {
            part_type: "output_text".to_string(),
            text: Some(text.clone()),
            data: Value::String(text.clone()),
        }],
        Some(_) => {
            return Err(HubCanonicalError::new(
                "responses conversation message content must be array/object/string",
            ))
        }
        None => Vec::new(),
    };

    Ok(HubCanonicalMessage {
        role,
        name,
        content,
    })
}

fn extract_output_part(item: &Value) -> HubCanonicalContentPart {
    let part_type = item
        .get("type")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or("output_text")
        .to_string();
    let text = item
        .get("text")
        .and_then(Value::as_str)
        .or_else(|| item.get("output_text").and_then(Value::as_str))
        .or_else(|| item.get("output").and_then(Value::as_str))
        .map(ToOwned::to_owned);

    HubCanonicalContentPart {
        part_type,
        text,
        data: item.clone(),
    }
}

fn extract_required_action_parts(
    response_body: &Value,
) -> Result<Vec<HubCanonicalContentPart>, HubCanonicalError> {
    let Some(tool_calls) = response_body
        .get("required_action")
        .and_then(|value| value.get("submit_tool_outputs"))
        .and_then(|value| value.get("tool_calls"))
        .and_then(Value::as_array)
    else {
        return Ok(Vec::new());
    };

    tool_calls
        .iter()
        .map(|call| {
            let record = call.as_object().ok_or_else(|| {
                HubCanonicalError::new("required_action tool_calls entries must be objects")
            })?;
            let call_id = read_trimmed_string(record, &["call_id", "tool_call_id", "id"])
                .ok_or_else(|| {
                    HubCanonicalError::new(
                        "required_action tool_calls entries require call_id/tool_call_id/id",
                    )
                })?;
            let name = read_trimmed_string(record, &["name"])
                .or_else(|| {
                    record
                        .get("function")
                        .and_then(Value::as_object)
                        .and_then(|function| read_trimmed_string(function, &["name"]))
                })
                .ok_or_else(|| {
                    HubCanonicalError::new("required_action tool_calls entries require name")
                })?;
            let arguments = record
                .get("arguments")
                .cloned()
                .or_else(|| {
                    record
                        .get("function")
                        .and_then(Value::as_object)
                        .and_then(|function| function.get("arguments"))
                        .cloned()
                })
                .unwrap_or(Value::Null);

            Ok(HubCanonicalContentPart {
                part_type: "function_call".to_string(),
                text: None,
                data: Value::Object(Map::from_iter([
                    (
                        "type".to_string(),
                        Value::String("function_call".to_string()),
                    ),
                    ("call_id".to_string(), Value::String(call_id)),
                    (
                        "tool_call_id".to_string(),
                        record.get("tool_call_id").cloned().unwrap_or(Value::Null),
                    ),
                    (
                        "id".to_string(),
                        record.get("id").cloned().unwrap_or(Value::Null),
                    ),
                    ("name".to_string(), Value::String(name)),
                    ("arguments".to_string(), arguments),
                ])),
            })
        })
        .collect()
}

fn has_required_action_tool_calls(response_body: &Value) -> bool {
    response_body
        .get("required_action")
        .and_then(|value| value.get("submit_tool_outputs"))
        .and_then(|value| value.get("tool_calls"))
        .and_then(Value::as_array)
        .map(|items| !items.is_empty())
        .unwrap_or(false)
}

fn read_response_id(response_body: &Value) -> Option<String> {
    response_body
        .get("id")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
}

fn read_trimmed_string(record: &Map<String, Value>, keys: &[&str]) -> Option<String> {
    keys.iter()
        .filter_map(|key| record.get(*key).and_then(Value::as_str))
        .map(str::trim)
        .find(|value| !value.is_empty())
        .map(ToOwned::to_owned)
}

fn merge_metadata(target: &mut Map<String, Value>, incoming: &Map<String, Value>) {
    for (key, value) in incoming {
        target.insert(key.clone(), value.clone());
    }
}

#[cfg(test)]
mod tests {
    use super::{
        prepare_responses_conversation_entry, record_responses_conversation_response,
        response_id_from_continuation_request, resume_responses_conversation,
    };
    use crate::{
        HubCanonicalContentPart, HubCanonicalMessage, HubCanonicalRequest,
        HubCanonicalToolDefinition, HubCanonicalToolResult,
    };
    use serde_json::{json, Map};

    fn base_request() -> HubCanonicalRequest {
        HubCanonicalRequest {
            source_protocol: "openai-responses".to_string(),
            operation: "responses".to_string(),
            model: Some("claude-sonnet-4-5".to_string()),
            stream: None,
            response_id: None,
            previous_response_id: None,
            messages: vec![HubCanonicalMessage {
                role: "user".to_string(),
                name: None,
                content: vec![HubCanonicalContentPart {
                    part_type: "input_text".to_string(),
                    text: Some("查询股价".to_string()),
                    data: json!({"type":"input_text","text":"查询股价"}),
                }],
            }],
            tools: vec![HubCanonicalToolDefinition {
                name: "lookup_price".to_string(),
                description: Some("查询股价".to_string()),
                parameters: json!({"type":"object"}),
                strict: None,
                raw: json!({}),
            }],
            tool_results: Vec::new(),
            metadata: Map::new(),
            raw_payload_text: "{}".to_string(),
        }
    }

    #[test]
    fn record_responses_conversation_response_extracts_output_function_call() {
        let mut entry = prepare_responses_conversation_entry(&base_request());
        let response_id = record_responses_conversation_response(
            &mut entry,
            &json!({
                "id": "resp_1",
                "output": [{
                    "type": "function_call",
                    "call_id": "call_lookup_price",
                    "name": "lookup_price",
                    "arguments": "{\"ticker\":\"AAPL\"}"
                }]
            }),
        )
        .expect("record response");

        assert_eq!(response_id.as_deref(), Some("resp_1"));
        assert_eq!(entry.last_response_id.as_deref(), Some("resp_1"));
        assert_eq!(entry.request.messages.len(), 2);
        assert_eq!(entry.request.messages[1].role, "assistant");
        assert_eq!(
            entry.request.messages[1].content[0].part_type,
            "function_call"
        );
    }

    #[test]
    fn record_responses_conversation_response_fails_when_continuation_signal_lacks_id() {
        let mut entry = prepare_responses_conversation_entry(&base_request());

        let error = record_responses_conversation_response(
            &mut entry,
            &json!({
                "output": [{
                    "type": "function_call",
                    "call_id": "call_lookup_price",
                    "name": "lookup_price"
                }]
            }),
        )
        .expect_err("missing id must fail");

        assert!(error.to_string().contains("requires response body id"));
    }

    #[test]
    fn resume_responses_conversation_restores_response_id_submit_request() {
        let mut entry = prepare_responses_conversation_entry(&base_request());
        record_responses_conversation_response(
            &mut entry,
            &json!({
                "id": "resp_1",
                "output": [{
                    "type": "function_call",
                    "call_id": "call_lookup_price",
                    "name": "lookup_price",
                    "arguments": "{\"ticker\":\"AAPL\"}"
                }]
            }),
        )
        .expect("record response");

        let restored = resume_responses_conversation(
            &entry,
            HubCanonicalRequest {
                response_id: Some("resp_1".to_string()),
                tool_results: vec![HubCanonicalToolResult {
                    tool_call_id: "call_lookup_price".to_string(),
                    output: json!("AAPL: 189.10"),
                    is_error: None,
                    raw: json!({"tool_call_id":"call_lookup_price","output":"AAPL: 189.10"}),
                }],
                raw_payload_text: r#"{"response_id":"resp_1","tool_outputs":[{"tool_call_id":"call_lookup_price","output":"AAPL: 189.10"}]}"#.to_string(),
                ..base_request()
            },
        )
        .expect("restored");

        assert_eq!(response_id_from_continuation_request(&restored), None);
        assert_eq!(restored.messages.len(), 3);
        assert_eq!(restored.messages[1].role, "assistant");
        assert_eq!(restored.messages[2].role, "tool");
        assert_eq!(
            restored.messages[2].content[0].data["tool_use_id"],
            "call_lookup_price"
        );
    }

    #[test]
    fn resume_responses_conversation_rejects_unknown_response_id() {
        let entry = prepare_responses_conversation_entry(&base_request());

        let error = resume_responses_conversation(
            &entry,
            HubCanonicalRequest {
                response_id: Some("resp_missing".to_string()),
                tool_results: vec![HubCanonicalToolResult {
                    tool_call_id: "call_lookup_price".to_string(),
                    output: json!("AAPL: 189.10"),
                    is_error: None,
                    raw: json!({}),
                }],
                ..base_request()
            },
        )
        .expect_err("must fail");

        assert!(error.to_string().contains("not found or mismatched"));
    }
}
