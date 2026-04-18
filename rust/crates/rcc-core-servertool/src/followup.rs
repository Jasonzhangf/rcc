mod tool_governance;

use rcc_core_domain::{
    compact_tool_content_in_messages, drop_tool_by_function_name,
    extract_responses_top_level_parameters, normalize_followup_parameters, resolve_followup_model,
    sanitize_followup_text, trim_openai_messages_for_followup, FollowupTrimOptions,
};
use serde_json::{Map, Value};
use tool_governance::{
    append_tool_if_missing, apply_force_tool_choice, ensure_standard_tools_if_missing,
    resolve_append_tool_if_missing, resolve_force_tool_choice,
    text_contains_reasoning_stop_or_stopless, text_requests_reasoning_stop,
    tools_include_reasoning_stop_case_insensitive,
};

const DEFAULT_MAX_NON_SYSTEM_MESSAGES: usize = 16;

pub fn build_followup_request(payload: &Value) -> Option<Value> {
    let record = payload.as_object()?;
    let captured = record.get("captured")?.as_object()?;

    let captured_model = captured.get("model").unwrap_or(&Value::Null);
    let adapter_context = record.get("adapter_context").unwrap_or(&Value::Null);
    let model = resolve_followup_model(captured_model, adapter_context);
    if model.is_empty() {
        return None;
    }

    let followup_text = sanitize_followup_text(record.get("followup_text").unwrap_or(&Value::Null));
    if followup_text.is_empty() {
        return None;
    }

    let max_non_system_messages = record
        .get("max_non_system_messages")
        .and_then(Value::as_u64)
        .map(|value| value.max(1) as usize)
        .unwrap_or(DEFAULT_MAX_NON_SYSTEM_MESSAGES);
    let tool_content_max_chars = record.get("tool_content_max_chars").and_then(Value::as_f64);

    let mut messages = trim_openai_messages_for_followup(
        captured.get("messages").unwrap_or(&Value::Null),
        FollowupTrimOptions {
            max_non_system_messages,
        },
    );

    let inject_system_text = resolve_optional_text(record.get("inject_system_text"), "text");
    if let Some(text) = inject_system_text.as_deref() {
        messages = inject_system_text_into_messages(messages, &text);
    }

    if let Some(summary) = resolve_optional_text(record.get("inject_vision_summary"), "summary") {
        messages = inject_vision_summary_into_messages(messages, &summary);
    }

    let chat_response = record.get("chat_response").unwrap_or(&Value::Null);
    if let Some(required) = resolve_append_required(record, "append_assistant_message") {
        match extract_assistant_message_from_chat_like(chat_response) {
            Some(message) => messages.push(message),
            None if required => return None,
            None => {}
        }
    }

    if let Some(required) =
        resolve_append_required(record, "append_tool_messages_from_tool_outputs")
    {
        let tool_messages = build_tool_messages_from_tool_outputs(chat_response);
        if tool_messages.is_empty() {
            if required {
                return None;
            }
        } else {
            messages.extend(tool_messages);
        }
    }

    messages = compact_tool_content_in_messages(&messages, tool_content_max_chars);
    messages.push(user_message(&followup_text));

    let mut parameters = resolve_parameters(captured).unwrap_or_default();
    let mut tools =
        resolve_tools(captured.get("tools"), record.get("drop_tool_name")).unwrap_or_default();

    if resolve_enabled_flag(record.get("ensure_standard_tools")) {
        let include_reasoning_stop_tool = tools_include_reasoning_stop_case_insensitive(&tools)
            || text_requests_reasoning_stop(record.get("followup_text"))
            || inject_system_text
                .as_deref()
                .is_some_and(text_contains_reasoning_stop_or_stopless);
        ensure_standard_tools_if_missing(&mut tools, include_reasoning_stop_tool);
    }

    if let Some(spec) = resolve_append_tool_if_missing(record.get("append_tool_if_missing")) {
        append_tool_if_missing(&mut tools, &spec.tool_name, spec.tool_definition);
    }

    if let Some(action) = resolve_force_tool_choice(record.get("force_tool_choice")) {
        apply_force_tool_choice(&mut parameters, action);
    }

    let mut out = Map::new();
    out.insert("model".to_string(), Value::String(model));
    out.insert("messages".to_string(), Value::Array(messages));
    if !tools.is_empty() {
        out.insert("tools".to_string(), Value::Array(tools));
    }
    if !parameters.is_empty() {
        out.insert("parameters".to_string(), Value::Object(parameters));
    }
    Some(Value::Object(out))
}

fn resolve_parameters(captured: &Map<String, Value>) -> Option<Map<String, Value>> {
    if let Some(value) = captured.get("parameters") {
        return normalize_followup_parameters(value);
    }
    let top_level = extract_responses_top_level_parameters(captured)?;
    normalize_followup_parameters(&Value::Object(top_level))
}

fn resolve_tools(tools: Option<&Value>, drop_tool_name: Option<&Value>) -> Option<Vec<Value>> {
    let tools = tools?;
    let drop_name = drop_tool_name
        .and_then(Value::as_str)
        .map(str::trim)
        .unwrap_or("");
    if drop_name.is_empty() {
        return tools.as_array().cloned();
    }
    drop_tool_by_function_name(tools, drop_name)
}

fn resolve_enabled_flag(value: Option<&Value>) -> bool {
    match value {
        Some(Value::Bool(enabled)) => *enabled,
        Some(Value::Object(record)) => {
            record.get("enabled").and_then(Value::as_bool) != Some(false)
        }
        Some(Value::Null) | None => false,
        Some(_) => true,
    }
}

fn resolve_optional_text(value: Option<&Value>, field: &str) -> Option<String> {
    match value? {
        Value::String(text) => {
            let text = text.trim();
            (!text.is_empty()).then(|| text.to_string())
        }
        Value::Object(record) => {
            if record.get("enabled").and_then(Value::as_bool) == Some(false) {
                return None;
            }
            let text = record.get(field)?.as_str()?.trim();
            (!text.is_empty()).then(|| text.to_string())
        }
        _ => None,
    }
}

fn resolve_append_required(record: &Map<String, Value>, key: &str) -> Option<bool> {
    let value = record.get(key)?;
    match value {
        Value::Bool(true) => Some(true),
        Value::Bool(false) | Value::Null => None,
        Value::Object(obj) => {
            if obj.get("enabled").and_then(Value::as_bool) == Some(false) {
                return None;
            }
            Some(obj.get("required").and_then(Value::as_bool).unwrap_or(true))
        }
        _ => Some(true),
    }
}

fn extract_assistant_message_from_chat_like(chat_response: &Value) -> Option<Value> {
    let record = chat_response.as_object()?;

    if let Some(choices) = record.get("choices").and_then(Value::as_array) {
        if let Some(first) = choices.first().and_then(Value::as_object) {
            if let Some(message) = first.get("message").and_then(Value::as_object) {
                return Some(Value::Object(message.clone()));
            }
        }
    }

    record
        .get("output_text")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|text| !text.is_empty())
        .map(|text| assistant_message(text))
}

fn build_tool_messages_from_tool_outputs(chat_response: &Value) -> Vec<Value> {
    let Some(record) = chat_response.as_object() else {
        return Vec::new();
    };
    let Some(tool_outputs) = record.get("tool_outputs").and_then(Value::as_array) else {
        return Vec::new();
    };

    tool_outputs
        .iter()
        .filter_map(|entry| {
            let record = entry.as_object()?;
            let tool_call_id = record.get("tool_call_id").and_then(Value::as_str)?.trim();
            if tool_call_id.is_empty() {
                return None;
            }
            let name = record
                .get("name")
                .and_then(Value::as_str)
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .unwrap_or("tool");
            let content = stringify_tool_output_content(record.get("content"));
            Some(tool_message(tool_call_id, name, content))
        })
        .collect()
}

fn stringify_tool_output_content(value: Option<&Value>) -> String {
    match value {
        Some(Value::String(text)) => text.clone(),
        Some(Value::Null) | None => {
            serde_json::to_string(&Value::Object(Map::new())).expect("empty object json")
        }
        Some(other) => serde_json::to_string(other).unwrap_or_else(|_| other.to_string()),
    }
}

fn inject_system_text_into_messages(mut messages: Vec<Value>, text: &str) -> Vec<Value> {
    if text.trim().is_empty() {
        return messages;
    }

    let insert_at = messages
        .iter()
        .position(|message| !message_role_is(message, "system"))
        .unwrap_or(messages.len());
    messages.insert(insert_at, system_message(text));
    messages
}

fn inject_vision_summary_into_messages(mut messages: Vec<Value>, summary: &str) -> Vec<Value> {
    if summary.trim().is_empty() {
        return messages;
    }

    let vision_text = format!("[Vision] {summary}");
    let mut injected = false;

    for message in &mut messages {
        let Some(record) = message.as_object_mut() else {
            continue;
        };
        let Some(parts) = record.get("content").and_then(Value::as_array).cloned() else {
            continue;
        };

        let mut removed = false;
        let mut next_parts = Vec::with_capacity(parts.len() + 1);
        for part in parts {
            if part_type_contains_image(&part) {
                removed = true;
                next_parts.push(text_part("[Image omitted]"));
            } else {
                next_parts.push(part);
            }
        }

        if removed {
            next_parts.push(text_part(&vision_text));
            record.insert("content".to_string(), Value::Array(next_parts));
            injected = true;
        }
    }

    if !injected {
        for message in messages.iter_mut().rev() {
            if !message_role_is(message, "user") {
                continue;
            }
            let Some(record) = message.as_object_mut() else {
                continue;
            };

            match record.get_mut("content") {
                Some(Value::Array(parts)) => parts.push(text_part(&vision_text)),
                Some(Value::String(text)) if !text.is_empty() => {
                    text.push('\n');
                    text.push_str(&vision_text);
                }
                Some(content) => *content = Value::String(vision_text.clone()),
                None => {
                    record.insert("content".to_string(), Value::String(vision_text.clone()));
                }
            }
            injected = true;
            break;
        }
    }

    if !injected {
        messages.push(user_message(&vision_text));
    }

    messages
}

fn part_type_contains_image(part: &Value) -> bool {
    part.as_object()
        .and_then(|record| record.get("type"))
        .and_then(Value::as_str)
        .map(str::to_ascii_lowercase)
        .is_some_and(|value| value.contains("image"))
}

fn message_role_is(message: &Value, expected: &str) -> bool {
    message
        .as_object()
        .and_then(|record| record.get("role"))
        .and_then(Value::as_str)
        .map(str::trim)
        .is_some_and(|role| role.eq_ignore_ascii_case(expected))
}

fn assistant_message(content: &str) -> Value {
    Value::Object(Map::from_iter([
        ("role".to_string(), Value::String("assistant".to_string())),
        ("content".to_string(), Value::String(content.to_string())),
    ]))
}

fn system_message(content: &str) -> Value {
    Value::Object(Map::from_iter([
        ("role".to_string(), Value::String("system".to_string())),
        ("content".to_string(), Value::String(content.to_string())),
    ]))
}

fn user_message(content: &str) -> Value {
    Value::Object(Map::from_iter([
        ("role".to_string(), Value::String("user".to_string())),
        ("content".to_string(), Value::String(content.to_string())),
    ]))
}

fn tool_message(tool_call_id: &str, name: &str, content: String) -> Value {
    Value::Object(Map::from_iter([
        ("role".to_string(), Value::String("tool".to_string())),
        (
            "tool_call_id".to_string(),
            Value::String(tool_call_id.to_string()),
        ),
        ("name".to_string(), Value::String(name.to_string())),
        ("content".to_string(), Value::String(content)),
    ]))
}

fn text_part(text: &str) -> Value {
    Value::Object(Map::from_iter([
        ("type".to_string(), Value::String("text".to_string())),
        ("text".to_string(), Value::String(text.to_string())),
    ]))
}

#[cfg(test)]
mod tests;
