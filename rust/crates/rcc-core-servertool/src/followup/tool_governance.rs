use crate::reasoning_stop::reasoning_stop_tool_definition;
use serde_json::{Map, Value};

pub(super) enum ForceToolChoiceAction {
    Clear,
    Set(Value),
}

pub(super) struct AppendToolIfMissingSpec {
    pub(super) tool_name: String,
    pub(super) tool_definition: Value,
}

pub(super) fn resolve_force_tool_choice(value: Option<&Value>) -> Option<ForceToolChoiceAction> {
    match value? {
        Value::Null => Some(ForceToolChoiceAction::Clear),
        Value::Object(record) => {
            if record.get("enabled").and_then(Value::as_bool) == Some(false) {
                return None;
            }
            if record.get("clear").and_then(Value::as_bool) == Some(true) {
                return Some(ForceToolChoiceAction::Clear);
            }
            if let Some(raw) = record.get("value") {
                return Some(ForceToolChoiceAction::Set(raw.clone()));
            }
            if record.contains_key("enabled")
                || record.contains_key("clear")
                || record.contains_key("value")
            {
                return None;
            }
            Some(ForceToolChoiceAction::Set(Value::Object(record.clone())))
        }
        other => Some(ForceToolChoiceAction::Set(other.clone())),
    }
}

pub(super) fn resolve_append_tool_if_missing(
    value: Option<&Value>,
) -> Option<AppendToolIfMissingSpec> {
    let record = value?.as_object()?;
    if record.get("enabled").and_then(Value::as_bool) == Some(false) {
        return None;
    }
    let tool_name = record.get("tool_name").and_then(Value::as_str)?.trim();
    if tool_name.is_empty() {
        return None;
    }
    let tool_definition = record.get("tool_definition")?;
    if !tool_definition.is_object() {
        return None;
    }
    Some(AppendToolIfMissingSpec {
        tool_name: tool_name.to_string(),
        tool_definition: tool_definition.clone(),
    })
}

pub(super) fn apply_force_tool_choice(
    parameters: &mut Map<String, Value>,
    action: ForceToolChoiceAction,
) {
    match action {
        ForceToolChoiceAction::Clear => {
            parameters.remove("tool_choice");
        }
        ForceToolChoiceAction::Set(value) => {
            let should_disable_parallel = tool_choice_is_function(&value);
            parameters.insert("tool_choice".to_string(), value);
            if should_disable_parallel {
                parameters.insert("parallel_tool_calls".to_string(), Value::Bool(false));
            }
        }
    }
}

pub(super) fn ensure_standard_tools_if_missing(
    tools: &mut Vec<Value>,
    include_reasoning_stop_tool: bool,
) {
    if tools.is_empty() {
        return;
    }
    if include_reasoning_stop_tool && !tools_contain_named_function_exact(tools, "reasoning.stop") {
        tools.push(reasoning_stop_tool_definition());
    }
}

pub(super) fn append_tool_if_missing(
    tools: &mut Vec<Value>,
    tool_name: &str,
    tool_definition: Value,
) {
    if tool_name.trim().is_empty() || !tool_definition.is_object() {
        return;
    }
    if tools_contain_named_function_exact(tools, tool_name) {
        return;
    }
    tools.push(tool_definition);
}

pub(super) fn text_requests_reasoning_stop(value: Option<&Value>) -> bool {
    value
        .and_then(Value::as_str)
        .is_some_and(text_contains_reasoning_stop_or_stopless)
}

pub(super) fn text_contains_reasoning_stop_or_stopless(text: &str) -> bool {
    let normalized = text.trim().to_ascii_lowercase();
    !normalized.is_empty()
        && (normalized.contains("reasoning.stop") || normalized.contains("stopless"))
}

pub(super) fn tools_include_reasoning_stop_case_insensitive(tools: &[Value]) -> bool {
    tools
        .iter()
        .filter_map(tool_function_name)
        .any(|name| name.eq_ignore_ascii_case("reasoning.stop"))
}

fn tool_choice_is_function(value: &Value) -> bool {
    value
        .as_object()
        .and_then(|record| record.get("type"))
        .and_then(Value::as_str)
        .is_some_and(|kind| kind.trim().eq_ignore_ascii_case("function"))
}

fn tools_contain_named_function_exact(tools: &[Value], expected: &str) -> bool {
    tools
        .iter()
        .filter_map(tool_function_name)
        .any(|name| name == expected)
}

fn tool_function_name(tool: &Value) -> Option<&str> {
    tool.as_object()?
        .get("function")?
        .as_object()?
        .get("name")?
        .as_str()
        .map(str::trim)
        .filter(|name| !name.is_empty())
}
