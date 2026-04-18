mod directive_mode;
mod fail_count;
mod state_view;
mod sticky_store;

pub use directive_mode::build_reasoning_stop_mode_sync_result;
pub use fail_count::{
    increment_reasoning_stop_fail_count, read_reasoning_stop_fail_count,
    reset_reasoning_stop_fail_count,
};
pub use state_view::{build_clear_reasoning_stop_state_result, read_reasoning_stop_state_view};
pub use sticky_store::{load_reasoning_stop_sticky_state, save_reasoning_stop_sticky_state};

use rcc_core_domain::{merge_reasoning_stop_serialization, RoutingStopMessageState};
use serde_json::{json, Map, Value};
use std::time::{SystemTime, UNIX_EPOCH};

const TOOL_NAME: &str = "reasoning.stop";
const SUMMARY_MAX_CHARS: usize = 4000;
const VALID_STOP_REASONS: &[&str] = &[
    "completed",
    "blocked",
    "user_input",
    "simple_question",
    "plan_mode",
];

#[derive(Debug, Clone, PartialEq, Eq)]
struct ReasoningStopPayload {
    task_goal: String,
    completed: bool,
    stop_reason: Option<String>,
    completion_evidence: String,
    cannot_complete_reason: String,
    blocking_evidence: String,
    attempts_exhausted: Option<bool>,
    next_step: String,
    user_input_required: Option<bool>,
    user_question: String,
    learning: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
enum ReasoningStopNormalized {
    Ok(ReasoningStopPayload),
    Err {
        code: &'static str,
        message: &'static str,
    },
}

pub(crate) fn reasoning_stop_tool_definition() -> Value {
    json!({
        "type": "function",
        "function": {
            "name": TOOL_NAME,
            "description": "Structured stop self-check gate. Stop is allowed only when either: (A) task is completed with completion_evidence; or (B) all feasible attempts are exhausted and the task is irrecoverably blocked, with cannot_complete_reason + blocking_evidence + attempts_exhausted=true; or (C) is_simple_question=true (simple factual question that can be answered directly). If the current task is plan mode / audit / other intentionally read-only work and the requested deliverable is already complete, set is_completed=true, stop_reason=plan_mode, and provide completion_evidence. If user input is required, also provide user_input_required=true and user_question. Required: task_goal, is_completed. If not completed but a concrete next action exists, fill next_step and continue instead of stopping.",
            "parameters": {
                "type": "object",
                "properties": {
                    "task_goal": { "type": "string" },
                    "is_completed": { "type": "boolean" },
                    "stop_reason": {
                        "type": "string",
                        "enum": ["completed", "blocked", "user_input", "simple_question", "plan_mode"],
                        "description": "Optional structured stop reason. Use plan_mode for plan/audit/other intentionally read-only tasks whose requested deliverable is already complete."
                    },
                    "completion_evidence": { "type": "string" },
                    "cannot_complete_reason": { "type": "string" },
                    "blocking_evidence": { "type": "string" },
                    "attempts_exhausted": { "type": "boolean" },
                    "next_step": { "type": "string" },
                    "user_input_required": { "type": "boolean" },
                    "user_question": { "type": "string" },
                    "learning": { "type": "string" },
                    "is_simple_question": {
                        "type": "boolean",
                        "description": "True if this is a simple factual question that can be answered directly without further execution"
                    }
                },
                "required": ["task_goal", "is_completed"],
                "additionalProperties": false
            }
        }
    })
}

pub fn build_reasoning_stop_tool_output(payload: &Value) -> Option<Value> {
    let tool_call = payload.as_object()?.get("tool_call")?.as_object()?;
    let tool_call_id = tool_call
        .get("id")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|id| !id.is_empty())?;
    let tool_name = tool_call
        .get("name")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|name| !name.is_empty())?;
    if tool_name != TOOL_NAME {
        return None;
    }

    let content = match normalize_reasoning_stop_payload(parse_tool_arguments(tool_call)) {
        ReasoningStopNormalized::Ok(normalized) => {
            json!({ "ok": true, "summary": build_summary(&normalized) })
        }
        ReasoningStopNormalized::Err { code, message } => {
            json!({ "ok": false, "code": code, "message": message })
        }
    };

    Some(json!({
        "tool_call_id": tool_call_id,
        "name": TOOL_NAME,
        "content": serde_json::to_string(&content).expect("reasoning stop content should serialize")
    }))
}

pub fn build_reasoning_stop_state_patch(payload: &Value) -> Option<Value> {
    let record = payload.as_object()?;
    let summary = resolve_reasoning_stop_summary(record)?;
    let base_state = record
        .get("base_state")
        .and_then(Value::as_object)
        .cloned()
        .unwrap_or_default();

    let state = RoutingStopMessageState {
        reasoning_stop_armed: Some(true),
        reasoning_stop_summary: Some(summary),
        reasoning_stop_updated_at: Some(resolve_updated_at(record)),
        ..Default::default()
    };

    Some(Value::Object(merge_reasoning_stop_serialization(
        &base_state,
        &state,
    )))
}

fn parse_tool_arguments(tool_call: &Map<String, Value>) -> Map<String, Value> {
    let Some(arguments) = tool_call.get("arguments").and_then(Value::as_str) else {
        return Map::new();
    };

    serde_json::from_str::<Value>(arguments)
        .ok()
        .and_then(|value| value.as_object().cloned())
        .unwrap_or_default()
}

fn resolve_reasoning_stop_summary(record: &Map<String, Value>) -> Option<String> {
    normalize_summary(record.get("summary").and_then(Value::as_str)).or_else(|| {
        record
            .get("tool_output")
            .and_then(extract_summary_from_tool_output)
    })
}

fn extract_summary_from_tool_output(tool_output: &Value) -> Option<String> {
    let record = tool_output.as_object()?;
    if record.get("name").and_then(Value::as_str).map(str::trim) != Some(TOOL_NAME) {
        return None;
    }

    let content = record.get("content").and_then(Value::as_str)?;
    let parsed = serde_json::from_str::<Value>(content).ok()?;
    let parsed_record = parsed.as_object()?;
    if parsed_record.get("ok").and_then(Value::as_bool) != Some(true) {
        return None;
    }

    normalize_summary(parsed_record.get("summary").and_then(Value::as_str))
}

fn normalize_summary(value: Option<&str>) -> Option<String> {
    let summary = value?.trim();
    if summary.is_empty() {
        return None;
    }
    let mut normalized = summary.to_string();
    if normalized.chars().count() > SUMMARY_MAX_CHARS {
        normalized = normalized.chars().take(SUMMARY_MAX_CHARS).collect();
    }
    Some(normalized)
}

fn resolve_updated_at(record: &Map<String, Value>) -> f64 {
    if let Some(updated_at) = record
        .get("updated_at")
        .and_then(Value::as_f64)
        .filter(|value| value.is_finite())
    {
        return updated_at.floor().max(0.0);
    }

    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as f64)
        .unwrap_or(0.0)
}

fn normalize_reasoning_stop_payload(args: Map<String, Value>) -> ReasoningStopNormalized {
    let task_goal = read_text(&args, &["task_goal", "taskGoal", "goal"]);
    if task_goal.is_empty() {
        return ReasoningStopNormalized::Err {
            code: "TASK_GOAL_REQUIRED",
            message: "reasoning.stop requires task_goal.",
        };
    }

    let Some(completed) = read_bool(&args, &["is_completed", "isCompleted", "completed"]) else {
        return ReasoningStopNormalized::Err {
            code: "IS_COMPLETED_REQUIRED",
            message: "reasoning.stop requires is_completed(boolean).",
        };
    };

    let stop_reason = read_stop_reason(
        &args,
        &["stop_reason", "stopReason", "reason_type", "reasonType"],
    );
    let completion_evidence = read_text(
        &args,
        &["completion_evidence", "completionEvidence", "evidence"],
    );
    let cannot_complete_reason = read_text(
        &args,
        &["cannot_complete_reason", "cannotCompleteReason", "reason"],
    );
    let blocking_evidence = read_text(
        &args,
        &["blocking_evidence", "blockingEvidence", "block_evidence"],
    );
    let attempts_exhausted = read_bool(
        &args,
        &[
            "attempts_exhausted",
            "attemptsExhausted",
            "all_attempts_exhausted",
            "allAttemptsExhausted",
        ],
    );
    let next_step = read_text(
        &args,
        &[
            "next_step",
            "nextStep",
            "next_steps",
            "nextSteps",
            "plan_next_step",
            "next_plan",
        ],
    );
    let user_input_required = read_bool(&args, &["user_input_required", "userInputRequired"]);
    let user_question = read_text(
        &args,
        &[
            "user_question",
            "userQuestion",
            "question_for_user",
            "questionForUser",
        ],
    );
    let learning = read_text(
        &args,
        &[
            "learning",
            "experience",
            "insight",
            "lesson",
            "lesson_learned",
        ],
    );

    if completed && completion_evidence.is_empty() {
        return ReasoningStopNormalized::Err {
            code: "COMPLETION_EVIDENCE_REQUIRED",
            message: "reasoning.stop requires completion_evidence when is_completed=true.",
        };
    }
    if completed && user_input_required == Some(true) {
        return ReasoningStopNormalized::Err {
            code: "USER_INPUT_CONFLICT_WITH_COMPLETED",
            message: "reasoning.stop cannot set user_input_required=true when is_completed=true.",
        };
    }
    if !completed && user_input_required == Some(true) {
        if cannot_complete_reason.is_empty() {
            return ReasoningStopNormalized::Err {
                code: "CANNOT_COMPLETE_REASON_REQUIRED_FOR_USER_INPUT",
                message:
                    "reasoning.stop requires cannot_complete_reason when user_input_required=true.",
            };
        }
        if user_question.is_empty() {
            return ReasoningStopNormalized::Err {
                code: "USER_QUESTION_REQUIRED",
                message: "reasoning.stop requires user_question when user_input_required=true.",
            };
        }
    }
    if !completed
        && user_input_required != Some(true)
        && cannot_complete_reason.is_empty()
        && next_step.is_empty()
    {
        return ReasoningStopNormalized::Err {
            code: "NEXT_STEP_OR_CANNOT_COMPLETE_REQUIRED",
            message:
                "reasoning.stop requires next_step or cannot_complete_reason when is_completed=false.",
        };
    }
    if !completed
        && !cannot_complete_reason.is_empty()
        && next_step.is_empty()
        && attempts_exhausted != Some(true)
    {
        return ReasoningStopNormalized::Err {
            code: "ATTEMPTS_EXHAUSTED_REQUIRED",
            message:
                "reasoning.stop requires attempts_exhausted=true when stopping with cannot_complete_reason.",
        };
    }
    if !completed
        && !cannot_complete_reason.is_empty()
        && next_step.is_empty()
        && blocking_evidence.is_empty()
    {
        return ReasoningStopNormalized::Err {
            code: "BLOCKING_EVIDENCE_REQUIRED",
            message:
                "reasoning.stop requires blocking_evidence when stopping with cannot_complete_reason.",
        };
    }

    ReasoningStopNormalized::Ok(ReasoningStopPayload {
        task_goal,
        completed,
        stop_reason,
        completion_evidence,
        cannot_complete_reason,
        blocking_evidence,
        attempts_exhausted,
        next_step,
        user_input_required,
        user_question,
        learning: if learning.is_empty() {
            None
        } else {
            Some(learning)
        },
    })
}

fn read_text(args: &Map<String, Value>, keys: &[&str]) -> String {
    keys.iter()
        .filter_map(|key| args.get(*key))
        .filter_map(Value::as_str)
        .map(str::trim)
        .find(|value| !value.is_empty())
        .unwrap_or_default()
        .to_string()
}

fn read_bool(args: &Map<String, Value>, keys: &[&str]) -> Option<bool> {
    keys.iter().find_map(|key| match args.get(*key) {
        Some(Value::Bool(value)) => Some(*value),
        Some(Value::String(value)) if value.trim().eq_ignore_ascii_case("true") => Some(true),
        Some(Value::String(value)) if value.trim().eq_ignore_ascii_case("false") => Some(false),
        _ => None,
    })
}

fn read_stop_reason(args: &Map<String, Value>, keys: &[&str]) -> Option<String> {
    let value = read_text(args, keys);
    if value.is_empty() {
        return None;
    }
    let lowered = value.to_lowercase();
    VALID_STOP_REASONS
        .iter()
        .find(|candidate| **candidate == lowered)
        .map(|candidate| candidate.to_string())
}

fn build_summary(payload: &ReasoningStopPayload) -> String {
    let mut lines = vec![
        format!("用户任务目标: {}", payload.task_goal),
        format!("是否完成: {}", if payload.completed { "是" } else { "否" }),
    ];

    if let Some(stop_reason) = &payload.stop_reason {
        lines.push(format!("停止原因: {}", stop_reason));
    }

    if payload.completed {
        lines.push(format!("完成证据: {}", payload.completion_evidence));
    } else {
        if let Some(user_input_required) = payload.user_input_required {
            lines.push(format!(
                "需用户参与: {}",
                if user_input_required { "是" } else { "否" }
            ));
        }
        if !payload.user_question.is_empty() {
            lines.push(format!("用户问题: {}", payload.user_question));
        }
        if !payload.cannot_complete_reason.is_empty() {
            if let Some(attempts_exhausted) = payload.attempts_exhausted {
                lines.push(format!(
                    "已穷尽可行尝试: {}",
                    if attempts_exhausted { "是" } else { "否" }
                ));
            }
            lines.push(format!("无法完成原因: {}", payload.cannot_complete_reason));
            if !payload.blocking_evidence.is_empty() {
                lines.push(format!("阻塞证据: {}", payload.blocking_evidence));
            }
        }
        if !payload.next_step.is_empty() {
            lines.push(format!("下一步: {}", payload.next_step));
        }
    }

    if let Some(learning) = &payload.learning {
        lines.push(format!("经验沉淀: {}", learning));
    }

    lines.join("\n")
}

#[cfg(test)]
mod tests;
