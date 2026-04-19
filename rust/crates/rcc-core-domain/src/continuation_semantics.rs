use crate::ContinuationStickyScope;
use serde_json::{Map, Value};

const RESPONSES_RESUME_METADATA_KEY: &str = "responsesResume";

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ContinuationToolMode {
    SubmitToolOutputs,
    RequiredAction,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ContinuationResumeFrom {
    pub protocol: String,
    pub request_id: Option<String>,
    pub response_id: Option<String>,
    pub previous_response_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ContinuationToolSemantics {
    pub mode: ContinuationToolMode,
    pub submitted_tool_call_ids: Vec<String>,
    pub pending_tool_call_ids: Vec<String>,
    pub resume_outputs: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ContinuationSemantics {
    pub chain_id: String,
    pub previous_turn_id: Option<String>,
    pub sticky_scope: ContinuationStickyScope,
    pub state_origin: String,
    pub restored: bool,
    pub resume_from: ContinuationResumeFrom,
    pub tool_continuation: Option<ContinuationToolSemantics>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ResponsesResumeToolOutput {
    pub call_id: String,
    pub output_text: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ResponsesResumeState {
    pub previous_request_id: Option<String>,
    pub restored_from_response_id: Option<String>,
    pub tool_outputs_detailed: Vec<ResponsesResumeToolOutput>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RequestContinuationProjection {
    pub semantics: Option<ContinuationSemantics>,
    pub responses_resume: Option<ResponsesResumeState>,
    pub tool_outputs: Vec<RequestContinuationToolOutput>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RequestContinuationToolOutput {
    pub tool_call_id: String,
    pub content: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RequestContinuationInput<'a> {
    pub protocol: &'a str,
    pub request_id: &'a str,
    pub session_id: Option<&'a str>,
    pub conversation_id: Option<&'a str>,
    pub previous_response_id: Option<&'a str>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ResponseContinuationInput<'a> {
    pub protocol: &'a str,
    pub request_id: Option<&'a str>,
    pub response_id: Option<&'a str>,
    pub previous_response_id: Option<&'a str>,
    pub required_action: Option<&'a Value>,
    pub request_semantics: Option<&'a ContinuationSemantics>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ResponsesShellContinuationProjection {
    pub response_id: Option<String>,
    pub request_id: Option<String>,
    pub previous_response_id: Option<String>,
}

pub fn take_responses_resume_state(
    metadata: &mut Map<String, Value>,
) -> Option<ResponsesResumeState> {
    let raw = metadata.remove(RESPONSES_RESUME_METADATA_KEY)?;
    parse_responses_resume_state(&raw)
}

pub fn lift_request_continuation_semantics(
    input: RequestContinuationInput<'_>,
    metadata: &mut Map<String, Value>,
) -> RequestContinuationProjection {
    let responses_resume = take_responses_resume_state(metadata);
    let semantics = match trimmed_non_empty(Some(input.protocol)) {
        Some("openai-responses") => {
            build_responses_request_continuation(&input, responses_resume.as_ref())
        }
        Some("openai-chat") | Some("gemini-chat") => {
            build_non_responses_request_continuation(&input, ContinuationStickyScope::Session)
        }
        Some("anthropic-messages") => {
            build_non_responses_request_continuation(&input, ContinuationStickyScope::Conversation)
        }
        _ => None,
    };
    let tool_outputs = responses_resume
        .as_ref()
        .map(project_responses_resume_tool_outputs)
        .unwrap_or_default();

    RequestContinuationProjection {
        semantics,
        responses_resume,
        tool_outputs,
    }
}

pub fn project_response_continuation_semantics(
    input: ResponseContinuationInput<'_>,
) -> Option<ContinuationSemantics> {
    match trimmed_non_empty(Some(input.protocol)) {
        Some("openai-responses") => build_responses_response_continuation(input),
        Some("openai-chat" | "anthropic-messages" | "gemini-chat") => {
            input.request_semantics.cloned()
        }
        _ => input.request_semantics.cloned(),
    }
}

pub fn project_responses_shell_continuation(
    request: &Value,
    raw_provider_response: &Value,
) -> ResponsesShellContinuationProjection {
    let response_body = raw_provider_response.get("body").and_then(Value::as_object);
    let request_record = request.as_object();

    let response_id = response_body.and_then(|record| read_trimmed_string(record, &["id"]));
    let request_id = response_body.and_then(|record| read_trimmed_string(record, &["request_id"]));
    let previous_response_id = response_body
        .and_then(|record| read_trimmed_string(record, &["previous_response_id"]))
        .or_else(|| {
            request_record.and_then(|record| read_trimmed_string(record, &["previous_response_id"]))
        })
        .or_else(|| {
            request_record.and_then(|record| read_trimmed_string(record, &["response_id"]))
        });

    ResponsesShellContinuationProjection {
        response_id,
        request_id,
        previous_response_id,
    }
}

fn build_responses_request_continuation(
    input: &RequestContinuationInput<'_>,
    responses_resume: Option<&ResponsesResumeState>,
) -> Option<ContinuationSemantics> {
    let previous_response_id = trimmed_non_empty(input.previous_response_id).map(ToOwned::to_owned);
    let restored = responses_resume.is_some();
    if !restored && previous_response_id.is_none() {
        return None;
    }

    let chain_id = responses_resume
        .and_then(|resume| resume.previous_request_id.clone())
        .or_else(|| trimmed_non_empty(Some(input.request_id)).map(ToOwned::to_owned))?;
    let response_id = responses_resume.and_then(|resume| resume.restored_from_response_id.clone());
    let tool_continuation = responses_resume.and_then(build_submit_tool_outputs_semantics);

    Some(ContinuationSemantics {
        chain_id: chain_id.clone(),
        previous_turn_id: previous_response_id.clone(),
        sticky_scope: ContinuationStickyScope::RequestChain,
        state_origin: "openai-responses".to_string(),
        restored,
        resume_from: ContinuationResumeFrom {
            protocol: "openai-responses".to_string(),
            request_id: Some(chain_id),
            response_id,
            previous_response_id,
        },
        tool_continuation,
    })
}

fn build_non_responses_request_continuation(
    input: &RequestContinuationInput<'_>,
    sticky_scope: ContinuationStickyScope,
) -> Option<ContinuationSemantics> {
    let chain_id = match sticky_scope {
        ContinuationStickyScope::Session => {
            trimmed_non_empty(input.session_id).map(ToOwned::to_owned)?
        }
        ContinuationStickyScope::Conversation => {
            trimmed_non_empty(input.conversation_id).map(ToOwned::to_owned)?
        }
        ContinuationStickyScope::RequestChain | ContinuationStickyScope::Request => {
            trimmed_non_empty(Some(input.request_id)).map(ToOwned::to_owned)?
        }
    };

    Some(ContinuationSemantics {
        chain_id: chain_id.clone(),
        previous_turn_id: None,
        sticky_scope,
        state_origin: input.protocol.to_string(),
        restored: false,
        resume_from: ContinuationResumeFrom {
            protocol: input.protocol.to_string(),
            request_id: Some(chain_id),
            response_id: None,
            previous_response_id: None,
        },
        tool_continuation: None,
    })
}

fn build_responses_response_continuation(
    input: ResponseContinuationInput<'_>,
) -> Option<ContinuationSemantics> {
    let response_id = trimmed_non_empty(input.response_id).map(ToOwned::to_owned);
    let previous_response_id = trimmed_non_empty(input.previous_response_id).map(ToOwned::to_owned);
    let chain_id = trimmed_non_empty(input.request_id)
        .map(ToOwned::to_owned)
        .or_else(|| {
            input
                .request_semantics
                .map(|semantics| semantics.chain_id.clone())
        })
        .or_else(|| response_id.clone())?;

    let tool_continuation = input
        .required_action
        .and_then(build_required_action_semantics);
    if response_id.is_none() && previous_response_id.is_none() && tool_continuation.is_none() {
        return None;
    }

    Some(ContinuationSemantics {
        chain_id: chain_id.clone(),
        previous_turn_id: previous_response_id.clone(),
        sticky_scope: ContinuationStickyScope::RequestChain,
        state_origin: "openai-responses".to_string(),
        restored: true,
        resume_from: ContinuationResumeFrom {
            protocol: "openai-responses".to_string(),
            request_id: Some(chain_id),
            response_id,
            previous_response_id,
        },
        tool_continuation,
    })
}

fn project_responses_resume_tool_outputs(
    responses_resume: &ResponsesResumeState,
) -> Vec<RequestContinuationToolOutput> {
    responses_resume
        .tool_outputs_detailed
        .iter()
        .filter_map(|item| {
            let tool_call_id = trimmed_non_empty(Some(item.call_id.as_str()))?.to_string();
            Some(RequestContinuationToolOutput {
                tool_call_id,
                content: item.output_text.clone(),
            })
        })
        .collect()
}

fn build_submit_tool_outputs_semantics(
    responses_resume: &ResponsesResumeState,
) -> Option<ContinuationToolSemantics> {
    let submitted_tool_call_ids: Vec<String> = responses_resume
        .tool_outputs_detailed
        .iter()
        .filter_map(|item| trimmed_non_empty(Some(item.call_id.as_str())).map(ToOwned::to_owned))
        .collect();
    if submitted_tool_call_ids.is_empty() {
        return None;
    }

    let resume_outputs = responses_resume
        .tool_outputs_detailed
        .iter()
        .map(|item| item.output_text.clone())
        .collect();

    Some(ContinuationToolSemantics {
        mode: ContinuationToolMode::SubmitToolOutputs,
        submitted_tool_call_ids,
        pending_tool_call_ids: Vec::new(),
        resume_outputs,
    })
}

fn build_required_action_semantics(required_action: &Value) -> Option<ContinuationToolSemantics> {
    let tool_calls = required_action
        .get("submit_tool_outputs")
        .and_then(|value| value.get("tool_calls"))
        .and_then(Value::as_array)?;

    let pending_tool_call_ids: Vec<String> = tool_calls
        .iter()
        .filter_map(|call| {
            let record = call.as_object()?;
            read_trimmed_string(record, &["call_id", "tool_call_id", "id"])
        })
        .collect();
    if pending_tool_call_ids.is_empty() {
        return None;
    }

    Some(ContinuationToolSemantics {
        mode: ContinuationToolMode::RequiredAction,
        submitted_tool_call_ids: Vec::new(),
        pending_tool_call_ids,
        resume_outputs: Vec::new(),
    })
}

fn parse_responses_resume_state(value: &Value) -> Option<ResponsesResumeState> {
    let record = value.as_object()?;
    let previous_request_id = read_trimmed_string(record, &["previousRequestId"]);
    let restored_from_response_id = read_trimmed_string(record, &["restoredFromResponseId"]);
    let tool_outputs_detailed: Vec<ResponsesResumeToolOutput> = record
        .get("toolOutputsDetailed")
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .filter_map(|item| {
                    let record = item.as_object()?;
                    let call_id = read_trimmed_string(record, &["callId"])?;
                    let output_text = read_trimmed_string(record, &["outputText"])
                        .or_else(|| {
                            record
                                .get("outputText")
                                .and_then(Value::as_str)
                                .map(ToOwned::to_owned)
                        })
                        .unwrap_or_default();
                    Some(ResponsesResumeToolOutput {
                        call_id,
                        output_text,
                    })
                })
                .collect()
        })
        .unwrap_or_default();

    if previous_request_id.is_none()
        && restored_from_response_id.is_none()
        && tool_outputs_detailed.is_empty()
    {
        return None;
    }

    Some(ResponsesResumeState {
        previous_request_id,
        restored_from_response_id,
        tool_outputs_detailed,
    })
}

fn read_trimmed_string(record: &Map<String, Value>, keys: &[&str]) -> Option<String> {
    keys.iter()
        .filter_map(|key| record.get(*key))
        .filter_map(Value::as_str)
        .map(str::trim)
        .find(|value| !value.is_empty())
        .map(ToOwned::to_owned)
}

fn trimmed_non_empty(value: Option<&str>) -> Option<&str> {
    value.map(str::trim).filter(|value| !value.is_empty())
}

#[cfg(test)]
mod tests {
    use super::{
        lift_request_continuation_semantics, project_response_continuation_semantics,
        project_responses_shell_continuation, ContinuationStickyScope, ContinuationToolMode,
        RequestContinuationInput, ResponseContinuationInput,
    };
    use serde_json::{json, Map};

    #[test]
    fn continuation_semantics_lifts_responses_resume_into_request_chain_semantics() {
        let mut metadata = Map::from_iter([(
            "responsesResume".to_string(),
            json!({
                "previousRequestId": "req_chain_root_1",
                "restoredFromResponseId": "resp_restored_1",
                "toolOutputsDetailed": [{"callId":"tool_call_1","outputText":"done"}]
            }),
        )]);

        let lifted = lift_request_continuation_semantics(
            RequestContinuationInput {
                protocol: "openai-responses",
                request_id: "req-stage2-continuation",
                session_id: None,
                conversation_id: None,
                previous_response_id: Some("resp_prev_1"),
            },
            &mut metadata,
        );

        assert!(metadata.get("responsesResume").is_none());
        let semantics = lifted.semantics.expect("responses semantics");
        assert_eq!(semantics.chain_id, "req_chain_root_1");
        assert_eq!(
            semantics.sticky_scope,
            ContinuationStickyScope::RequestChain
        );
        assert!(semantics.restored);
        assert_eq!(
            semantics.resume_from.previous_response_id.as_deref(),
            Some("resp_prev_1")
        );
        assert_eq!(
            semantics.resume_from.response_id.as_deref(),
            Some("resp_restored_1")
        );
        assert_eq!(
            semantics
                .tool_continuation
                .as_ref()
                .expect("tool continuation")
                .mode,
            ContinuationToolMode::SubmitToolOutputs
        );
        assert_eq!(lifted.tool_outputs[0].tool_call_id, "tool_call_1");
        assert_eq!(lifted.tool_outputs[0].content, "done");
    }

    #[test]
    fn continuation_semantics_lifts_openai_chat_session_scope() {
        let mut metadata = Map::new();
        let lifted = lift_request_continuation_semantics(
            RequestContinuationInput {
                protocol: "openai-chat",
                request_id: "req-openai-chat-session-cont",
                session_id: Some("session_chat_1"),
                conversation_id: None,
                previous_response_id: None,
            },
            &mut metadata,
        );

        let semantics = lifted.semantics.expect("openai-chat semantics");
        assert_eq!(semantics.chain_id, "session_chat_1");
        assert_eq!(semantics.sticky_scope, ContinuationStickyScope::Session);
        assert_eq!(semantics.state_origin, "openai-chat");
        assert!(!semantics.restored);
    }

    #[test]
    fn continuation_semantics_lifts_anthropic_conversation_scope() {
        let mut metadata = Map::new();
        let lifted = lift_request_continuation_semantics(
            RequestContinuationInput {
                protocol: "anthropic-messages",
                request_id: "req-anthropic-conversation-cont",
                session_id: Some("session_should_lose"),
                conversation_id: Some("conversation_anthropic_1"),
                previous_response_id: None,
            },
            &mut metadata,
        );

        let semantics = lifted.semantics.expect("anthropic semantics");
        assert_eq!(semantics.chain_id, "conversation_anthropic_1");
        assert_eq!(
            semantics.sticky_scope,
            ContinuationStickyScope::Conversation
        );
        assert_eq!(semantics.state_origin, "anthropic-messages");
    }

    #[test]
    fn continuation_semantics_lifts_gemini_session_scope() {
        let mut metadata = Map::new();
        let lifted = lift_request_continuation_semantics(
            RequestContinuationInput {
                protocol: "gemini-chat",
                request_id: "req-gemini-session-cont",
                session_id: Some("session_gemini_1"),
                conversation_id: None,
                previous_response_id: None,
            },
            &mut metadata,
        );

        let semantics = lifted.semantics.expect("gemini semantics");
        assert_eq!(semantics.chain_id, "session_gemini_1");
        assert_eq!(semantics.sticky_scope, ContinuationStickyScope::Session);
        assert_eq!(semantics.state_origin, "gemini-chat");
    }

    #[test]
    fn continuation_semantics_projects_responses_required_action_on_response_side() {
        let semantics = project_response_continuation_semantics(ResponseContinuationInput {
            protocol: "openai-responses",
            request_id: Some("req_chain_resp_1"),
            response_id: Some("resp_out_1"),
            previous_response_id: Some("resp_prev_1"),
            required_action: Some(&json!({
                "submit_tool_outputs": {
                    "tool_calls": [{
                        "call_id": "call_resp_1",
                        "function": {"name":"shell_command","arguments":{"cmd":"pwd"}}
                    }]
                }
            })),
            request_semantics: None,
        })
        .expect("responses response semantics");

        assert_eq!(semantics.chain_id, "req_chain_resp_1");
        assert_eq!(semantics.previous_turn_id.as_deref(), Some("resp_prev_1"));
        assert_eq!(
            semantics.sticky_scope,
            ContinuationStickyScope::RequestChain
        );
        assert!(semantics.restored);
        assert_eq!(
            semantics
                .tool_continuation
                .as_ref()
                .expect("required_action")
                .mode,
            ContinuationToolMode::RequiredAction
        );
        assert_eq!(
            semantics
                .tool_continuation
                .as_ref()
                .expect("required_action")
                .pending_tool_call_ids[0],
            "call_resp_1"
        );
    }

    #[test]
    fn continuation_semantics_preserves_non_responses_request_semantics_on_response_side() {
        let request_semantics =
            project_response_continuation_semantics(ResponseContinuationInput {
                protocol: "openai-chat",
                request_id: Some("session_chat_resp_1"),
                response_id: None,
                previous_response_id: None,
                required_action: None,
                request_semantics: Some(&super::ContinuationSemantics {
                    chain_id: "session_chat_resp_1".to_string(),
                    previous_turn_id: None,
                    sticky_scope: ContinuationStickyScope::Session,
                    state_origin: "openai-chat".to_string(),
                    restored: false,
                    resume_from: super::ContinuationResumeFrom {
                        protocol: "openai-chat".to_string(),
                        request_id: Some("session_chat_resp_1".to_string()),
                        response_id: None,
                        previous_response_id: None,
                    },
                    tool_continuation: None,
                }),
            })
            .expect("preserved semantics");

        assert_eq!(request_semantics.chain_id, "session_chat_resp_1");
        assert_eq!(
            request_semantics.sticky_scope,
            ContinuationStickyScope::Session
        );
        assert_eq!(request_semantics.state_origin, "openai-chat");
    }

    #[test]
    fn continuation_semantics_projects_responses_shell_ids_from_raw_body() {
        let projected = project_responses_shell_continuation(
            &json!({"model":"gpt-4o-mini"}),
            &json!({
                "body": {
                    "id": "resp_shell_1",
                    "request_id": "req_shell_1",
                    "previous_response_id": "resp_prev_shell_1"
                }
            }),
        );

        assert_eq!(projected.response_id.as_deref(), Some("resp_shell_1"));
        assert_eq!(projected.request_id.as_deref(), Some("req_shell_1"));
        assert_eq!(
            projected.previous_response_id.as_deref(),
            Some("resp_prev_shell_1")
        );
    }

    #[test]
    fn continuation_semantics_projects_responses_shell_previous_response_id_from_request_fallback()
    {
        let projected = project_responses_shell_continuation(
            &json!({"previous_response_id":"resp_prev_req_1"}),
            &json!({
                "body": {
                    "id": "resp_shell_2"
                }
            }),
        );

        assert_eq!(projected.response_id.as_deref(), Some("resp_shell_2"));
        assert_eq!(
            projected.previous_response_id.as_deref(),
            Some("resp_prev_req_1")
        );
    }

    #[test]
    fn continuation_semantics_projects_responses_shell_response_id_request_fallback_for_submit() {
        let projected = project_responses_shell_continuation(
            &json!({"response_id":"resp_submit_1"}),
            &json!({
                "body": {
                    "id": "resp_shell_submit_1"
                }
            }),
        );

        assert_eq!(
            projected.response_id.as_deref(),
            Some("resp_shell_submit_1")
        );
        assert_eq!(
            projected.previous_response_id.as_deref(),
            Some("resp_submit_1")
        );
    }
}
