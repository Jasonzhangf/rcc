use serde_json::{json, Map, Value};

use crate::{
    project_json_fields, HubCanonicalContentPart, HubCanonicalMessage, HubCanonicalRequest,
    HubCanonicalToolDefinition, JsonFieldMappingRule,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum CompatRequestProjectionFeature {
    AnthropicSystem,
    AnthropicMessages,
    AnthropicTools,
    MetadataInBody,
    GeminiContents,
    GeminiSystemInstruction,
    GeminiTools,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) struct CompatRequestProjectionSpec {
    pub target_provider_id: &'static str,
    pub operation: &'static str,
    pub top_level_rules: &'static [JsonFieldMappingRule],
    pub features: &'static [CompatRequestProjectionFeature],
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct CompatRoleRule {
    canonical_role: &'static str,
    projected_role: &'static str,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct CompatProjectionFieldRule {
    source_keys: &'static [&'static str],
    target_field: &'static str,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct CompatToolDeclarationRule {
    name_field: &'static str,
    description_field: &'static str,
    schema_field: &'static str,
}

const ANTHROPIC_SYSTEM_ROLE_RULES: [&str; 2] = ["system", "developer"];
const GEMINI_SYSTEM_ROLE_RULES: [&str; 2] = ["system", "developer"];

const ANTHROPIC_MESSAGE_ROLE_RULES: [CompatRoleRule; 3] = [
    CompatRoleRule {
        canonical_role: "user",
        projected_role: "user",
    },
    CompatRoleRule {
        canonical_role: "assistant",
        projected_role: "assistant",
    },
    CompatRoleRule {
        canonical_role: "tool",
        projected_role: "user",
    },
];

const GEMINI_MESSAGE_ROLE_RULES: [CompatRoleRule; 3] = [
    CompatRoleRule {
        canonical_role: "user",
        projected_role: "user",
    },
    CompatRoleRule {
        canonical_role: "tool",
        projected_role: "user",
    },
    CompatRoleRule {
        canonical_role: "assistant",
        projected_role: "model",
    },
];

const ANTHROPIC_TEXT_PART_KIND_RULES: [&str; 4] = ["", "text", "input_text", "output_text"];
const ANTHROPIC_TOOL_CALL_PART_KIND_RULES: [&str; 2] = ["tool_call", "function_call"];
const ANTHROPIC_TOOL_RESULT_PART_KIND_RULES: [&str; 2] = ["tool_result", "function_call_output"];
const GEMINI_TEXT_PART_KIND_RULES: [&str; 3] = ["text", "input_text", "output_text"];
const GEMINI_FUNCTION_CALL_PART_KIND_RULES: [&str; 1] = ["function_call"];

const ANTHROPIC_TOOL_DECLARATION_RULE: CompatToolDeclarationRule = CompatToolDeclarationRule {
    name_field: "name",
    description_field: "description",
    schema_field: "input_schema",
};

const GEMINI_FUNCTION_DECLARATION_RULE: CompatToolDeclarationRule = CompatToolDeclarationRule {
    name_field: "name",
    description_field: "description",
    schema_field: "parameters",
};

const ANTHROPIC_TOOL_CALL_ID_FIELD_RULE: CompatProjectionFieldRule = CompatProjectionFieldRule {
    source_keys: &["id", "call_id", "tool_call_id"],
    target_field: "id",
};

const ANTHROPIC_TOOL_CALL_NAME_FIELD_RULE: CompatProjectionFieldRule = CompatProjectionFieldRule {
    source_keys: &["name"],
    target_field: "name",
};

const ANTHROPIC_TOOL_CALL_INPUT_FIELD_RULE: CompatProjectionFieldRule = CompatProjectionFieldRule {
    source_keys: &["input"],
    target_field: "input",
};

const ANTHROPIC_TOOL_CALL_ARGUMENTS_FIELD_RULE: CompatProjectionFieldRule =
    CompatProjectionFieldRule {
        source_keys: &["arguments"],
        target_field: "input",
    };

const ANTHROPIC_TOOL_RESULT_ID_FIELD_RULE: CompatProjectionFieldRule = CompatProjectionFieldRule {
    source_keys: &["tool_use_id", "tool_call_id", "call_id", "id"],
    target_field: "tool_use_id",
};

const ANTHROPIC_TOOL_RESULT_CONTENT_FIELD_RULE: CompatProjectionFieldRule =
    CompatProjectionFieldRule {
        source_keys: &["content"],
        target_field: "content",
    };

const GEMINI_FUNCTION_CALL_NAME_FIELD_RULE: CompatProjectionFieldRule = CompatProjectionFieldRule {
    source_keys: &["name"],
    target_field: "name",
};

const GEMINI_FUNCTION_CALL_ARGUMENTS_FIELD_RULE: CompatProjectionFieldRule =
    CompatProjectionFieldRule {
        source_keys: &["arguments"],
        target_field: "args",
    };

const GEMINI_FUNCTION_CALL_ID_FIELD_RULE: CompatProjectionFieldRule = CompatProjectionFieldRule {
    source_keys: &["call_id"],
    target_field: "id",
};

const GEMINI_FUNCTION_RESPONSE_NAME_FIELD_RULE: CompatProjectionFieldRule =
    CompatProjectionFieldRule {
        source_keys: &["name"],
        target_field: "name",
    };

const ANTHROPIC_TOP_LEVEL_RULES: [JsonFieldMappingRule; 2] = [
    JsonFieldMappingRule {
        source_pointer: "/model",
        target_field: "model",
        required: true,
    },
    JsonFieldMappingRule {
        source_pointer: "/stream",
        target_field: "stream",
        required: false,
    },
];

const ANTHROPIC_FEATURES: [CompatRequestProjectionFeature; 4] = [
    CompatRequestProjectionFeature::AnthropicSystem,
    CompatRequestProjectionFeature::AnthropicMessages,
    CompatRequestProjectionFeature::AnthropicTools,
    CompatRequestProjectionFeature::MetadataInBody,
];

const GEMINI_FEATURES: [CompatRequestProjectionFeature; 3] = [
    CompatRequestProjectionFeature::GeminiContents,
    CompatRequestProjectionFeature::GeminiSystemInstruction,
    CompatRequestProjectionFeature::GeminiTools,
];

pub(crate) const ANTHROPIC_REQUEST_PROJECTION_SPEC: CompatRequestProjectionSpec =
    CompatRequestProjectionSpec {
        target_provider_id: "anthropic",
        operation: "anthropic-messages",
        top_level_rules: &ANTHROPIC_TOP_LEVEL_RULES,
        features: &ANTHROPIC_FEATURES,
    };

pub(crate) const GEMINI_REQUEST_PROJECTION_SPEC: CompatRequestProjectionSpec =
    CompatRequestProjectionSpec {
        target_provider_id: "gemini",
        operation: "gemini-chat",
        top_level_rules: &[],
        features: &GEMINI_FEATURES,
    };

pub(crate) fn request_projection_spec_for_target(
    target_provider_id: &str,
) -> Option<&'static CompatRequestProjectionSpec> {
    match trimmed_non_empty(Some(target_provider_id)) {
        Some("anthropic") => Some(&ANTHROPIC_REQUEST_PROJECTION_SPEC),
        Some("gemini") => Some(&GEMINI_REQUEST_PROJECTION_SPEC),
        _ => None,
    }
}

pub(crate) fn build_request_projection_for_target(
    target_provider_id: &str,
    request: &HubCanonicalRequest,
) -> Result<(String, Map<String, Value>), String> {
    let spec = request_projection_spec_for_target(target_provider_id).ok_or_else(|| {
        format!(
            "canonical outbound target provider `{target_provider_id}` has no request projection spec"
        )
    })?;
    let body = build_request_body_from_projection_spec(spec, request)?;
    Ok((spec.operation.to_string(), body))
}

fn build_request_body_from_projection_spec(
    spec: &CompatRequestProjectionSpec,
    request: &HubCanonicalRequest,
) -> Result<Map<String, Value>, String> {
    let projection_source = build_top_level_projection_source(request);
    let mut body = project_json_fields(&projection_source, spec.top_level_rules)
        .map_err(|error| error.to_string())?;

    for feature in spec.features {
        match feature {
            CompatRequestProjectionFeature::AnthropicSystem => {
                if let Some(system) = build_anthropic_system_blocks(&request.messages)? {
                    body.insert("system".to_string(), system);
                }
            }
            CompatRequestProjectionFeature::AnthropicMessages => {
                body.insert(
                    "messages".to_string(),
                    Value::Array(build_anthropic_messages(&request.messages)?),
                );
            }
            CompatRequestProjectionFeature::AnthropicTools => {
                if !request.tools.is_empty() {
                    body.insert(
                        "tools".to_string(),
                        Value::Array(build_anthropic_tools(&request.tools)?),
                    );
                }
            }
            CompatRequestProjectionFeature::MetadataInBody => {
                if !request.metadata.is_empty() {
                    body.insert(
                        "metadata".to_string(),
                        Value::Object(request.metadata.clone()),
                    );
                }
            }
            CompatRequestProjectionFeature::GeminiContents => {
                body.insert(
                    "contents".to_string(),
                    Value::Array(build_gemini_contents(request)?),
                );
            }
            CompatRequestProjectionFeature::GeminiSystemInstruction => {
                if let Some(system_instruction) =
                    build_gemini_system_instruction(&request.messages)?
                {
                    body.insert("systemInstruction".to_string(), system_instruction);
                }
            }
            CompatRequestProjectionFeature::GeminiTools => {
                if !request.tools.is_empty() {
                    body.insert(
                        "tools".to_string(),
                        Value::Array(vec![json!({
                            "functionDeclarations": build_gemini_function_declarations(&request.tools)?
                        })]),
                    );
                }
            }
        }
    }

    Ok(body)
}

fn build_top_level_projection_source(request: &HubCanonicalRequest) -> Value {
    let mut source = Map::new();
    if let Some(model) = &request.model {
        source.insert("model".to_string(), Value::String(model.clone()));
    }
    if let Some(stream) = request.stream {
        source.insert("stream".to_string(), Value::Bool(stream));
    }
    Value::Object(source)
}

fn build_anthropic_system_blocks(
    messages: &[HubCanonicalMessage],
) -> Result<Option<Value>, String> {
    let mut blocks = Vec::new();
    for message in messages {
        if !is_anthropic_system_role(&message.role) {
            continue;
        }
        for part in &message.content {
            blocks.push(map_canonical_part_to_anthropic_block(part)?);
        }
    }

    if blocks.is_empty() {
        Ok(None)
    } else {
        Ok(Some(Value::Array(blocks)))
    }
}

fn build_anthropic_messages(messages: &[HubCanonicalMessage]) -> Result<Vec<Value>, String> {
    let mut mapped = Vec::new();

    for message in messages {
        if is_anthropic_system_role(&message.role) {
            continue;
        }

        let role = normalize_anthropic_message_role(&message.role)?;
        let content = message
            .content
            .iter()
            .map(map_canonical_part_to_anthropic_block)
            .collect::<Result<Vec<_>, _>>()?;

        mapped.push(json!({
            "role": role,
            "content": content,
        }));
    }

    Ok(mapped)
}

fn build_anthropic_tools(tools: &[HubCanonicalToolDefinition]) -> Result<Vec<Value>, String> {
    tools.iter().map(build_anthropic_tool_definition).collect()
}

fn build_anthropic_tool_definition(tool: &HubCanonicalToolDefinition) -> Result<Value, String> {
    build_tool_declaration_object(
        tool,
        &ANTHROPIC_TOOL_DECLARATION_RULE,
        normalize_tool_input_schema(&tool.parameters)?,
    )
}

fn normalize_tool_input_schema(parameters: &Value) -> Result<Value, String> {
    match parameters {
        Value::Object(_) => Ok(parameters.clone()),
        Value::Null => Ok(json!({})),
        _ => Err("anthropic tool input_schema must be object or null".to_string()),
    }
}

fn normalize_anthropic_message_role(role: &str) -> Result<&'static str, String> {
    normalize_message_role(role, &ANTHROPIC_MESSAGE_ROLE_RULES).or_else(|_| {
        if role.trim().is_empty() {
            Ok("user")
        } else {
            Err(format!(
                "canonical role `{}` cannot be projected to anthropic messages",
                role.trim()
            ))
        }
    })
}

fn is_anthropic_system_role(role: &str) -> bool {
    role_matches_any(role, &ANTHROPIC_SYSTEM_ROLE_RULES, false)
}

fn map_canonical_part_to_anthropic_block(part: &HubCanonicalContentPart) -> Result<Value, String> {
    match part.part_type.trim() {
        kind if part_kind_matches(kind, &ANTHROPIC_TEXT_PART_KIND_RULES, false) => {
            let text = part
                .text
                .clone()
                .or_else(|| part.data.as_str().map(ToOwned::to_owned))
                .ok_or_else(|| {
                    "text-like canonical content part requires text payload".to_string()
                })?;
            Ok(json!({
                "type": "text",
                "text": text,
            }))
        }
        kind if part_kind_matches(kind, &ANTHROPIC_TOOL_CALL_PART_KIND_RULES, false) => {
            map_tool_call_block(&part.data)
        }
        kind if part_kind_matches(kind, &ANTHROPIC_TOOL_RESULT_PART_KIND_RULES, false) => {
            map_tool_result_block(&part.data)
        }
        _ => match &part.data {
            Value::Object(record) => Ok(Value::Object(record.clone())),
            Value::String(text) => Ok(json!({
                "type": "text",
                "text": text,
            })),
            _ => Err(format!(
                "canonical content part `{}` cannot be projected to anthropic block",
                part.part_type
            )),
        },
    }
}

fn map_tool_call_block(value: &Value) -> Result<Value, String> {
    let record = value
        .as_object()
        .ok_or_else(|| "tool_call canonical content requires object payload".to_string())?;

    let id = read_required_string_by_rule(
        record,
        &ANTHROPIC_TOOL_CALL_ID_FIELD_RULE,
        "tool_call canonical content requires id/call_id/tool_call_id",
    )?;
    let name = read_optional_string_by_rule(record, &ANTHROPIC_TOOL_CALL_NAME_FIELD_RULE)
        .or_else(|| {
            record
                .get("function")
                .and_then(Value::as_object)
                .and_then(|function| {
                    read_optional_string_by_rule(function, &ANTHROPIC_TOOL_CALL_NAME_FIELD_RULE)
                })
        })
        .ok_or_else(|| "tool_call canonical content requires name".to_string())?;

    let input =
        if let Some(input) = read_value_by_rule(record, &ANTHROPIC_TOOL_CALL_INPUT_FIELD_RULE) {
            input
        } else if let Some(arguments) =
            record
                .get("function")
                .and_then(Value::as_object)
                .and_then(|function| {
                    read_value_by_rule(function, &ANTHROPIC_TOOL_CALL_ARGUMENTS_FIELD_RULE)
                })
        {
            normalize_tool_arguments(&arguments)?
        } else {
            json!({})
        };
    let mut object = Map::new();
    object.insert("type".to_string(), Value::String("tool_use".to_string()));
    insert_string_field(
        &mut object,
        ANTHROPIC_TOOL_CALL_ID_FIELD_RULE.target_field,
        id,
    );
    insert_string_field(
        &mut object,
        ANTHROPIC_TOOL_CALL_NAME_FIELD_RULE.target_field,
        name,
    );
    insert_value_field(
        &mut object,
        ANTHROPIC_TOOL_CALL_INPUT_FIELD_RULE.target_field,
        input,
    );
    Ok(Value::Object(object))
}

fn map_tool_result_block(value: &Value) -> Result<Value, String> {
    let record = value
        .as_object()
        .ok_or_else(|| "tool_result canonical content requires object payload".to_string())?;
    let tool_use_id = read_required_string_by_rule(
        record,
        &ANTHROPIC_TOOL_RESULT_ID_FIELD_RULE,
        "tool_result canonical content requires tool_use_id/call_id",
    )?;
    let content = read_value_by_rule(record, &ANTHROPIC_TOOL_RESULT_CONTENT_FIELD_RULE)
        .unwrap_or(Value::Null);

    let mut object = Map::new();
    object.insert("type".to_string(), Value::String("tool_result".to_string()));
    insert_string_field(
        &mut object,
        ANTHROPIC_TOOL_RESULT_ID_FIELD_RULE.target_field,
        tool_use_id,
    );
    insert_value_field(
        &mut object,
        ANTHROPIC_TOOL_RESULT_CONTENT_FIELD_RULE.target_field,
        content,
    );
    Ok(Value::Object(object))
}

fn normalize_tool_arguments(arguments: &Value) -> Result<Value, String> {
    match arguments {
        Value::Object(_) | Value::Array(_) | Value::Null | Value::Bool(_) | Value::Number(_) => {
            Ok(arguments.clone())
        }
        Value::String(raw) => serde_json::from_str(raw)
            .or_else(|_| Ok(Value::String(raw.clone())))
            .map_err(|error: serde_json::Error| error.to_string()),
    }
}

fn build_gemini_system_instruction(
    messages: &[HubCanonicalMessage],
) -> Result<Option<Value>, String> {
    let mut parts = Vec::new();
    for message in messages {
        if !is_gemini_system_role(&message.role) {
            continue;
        }
        for part in &message.content {
            if let Some(text) = extract_canonical_part_text(part) {
                parts.push(json!({ "text": text }));
            }
        }
    }

    if parts.is_empty() {
        Ok(None)
    } else {
        Ok(Some(json!({
            "role": "system",
            "parts": parts,
        })))
    }
}

fn build_gemini_contents(request: &HubCanonicalRequest) -> Result<Vec<Value>, String> {
    let mut contents = Vec::new();

    for message in &request.messages {
        if is_gemini_system_role(&message.role) {
            continue;
        }

        let role = normalize_gemini_message_role(&message.role)?;
        let parts = message
            .content
            .iter()
            .map(map_canonical_part_to_gemini_part)
            .collect::<Result<Vec<_>, _>>()?;
        if parts.is_empty() {
            continue;
        }

        contents.push(json!({
            "role": role,
            "parts": parts,
        }));
    }

    for tool_result in &request.tool_results {
        contents.push(json!({
            "role": "user",
            "parts": [{
                "functionResponse": {
                    "name": resolve_gemini_tool_result_name(request, tool_result),
                    "response": normalize_gemini_function_response_payload(&tool_result.output),
                }
            }]
        }));
    }

    Ok(contents)
}

fn build_gemini_function_declarations(
    tools: &[HubCanonicalToolDefinition],
) -> Result<Vec<Value>, String> {
    tools
        .iter()
        .map(build_gemini_function_declaration)
        .collect()
}

fn build_gemini_function_declaration(tool: &HubCanonicalToolDefinition) -> Result<Value, String> {
    build_tool_declaration_object(
        tool,
        &GEMINI_FUNCTION_DECLARATION_RULE,
        normalize_gemini_tool_parameters(&tool.parameters)?,
    )
}

fn normalize_gemini_tool_parameters(parameters: &Value) -> Result<Value, String> {
    match parameters {
        Value::Object(_) => Ok(parameters.clone()),
        Value::Null => Ok(json!({ "type": "object", "properties": {} })),
        other => Err(format!(
            "gemini tool parameters must be object or null, got {}",
            json_type_name(other)
        )),
    }
}

fn normalize_gemini_message_role(role: &str) -> Result<&'static str, String> {
    normalize_message_role(role, &GEMINI_MESSAGE_ROLE_RULES).map_err(|_| {
        format!(
            "canonical role `{}` cannot be projected to gemini contents",
            role.trim().to_ascii_lowercase()
        )
    })
}

fn is_gemini_system_role(role: &str) -> bool {
    role_matches_any(role, &GEMINI_SYSTEM_ROLE_RULES, true)
}

fn map_canonical_part_to_gemini_part(part: &HubCanonicalContentPart) -> Result<Value, String> {
    match part.part_type.trim().to_ascii_lowercase().as_str() {
        kind if part_kind_matches(kind, &GEMINI_TEXT_PART_KIND_RULES, true) => Ok(json!({
            "text": extract_canonical_part_text(part).unwrap_or_default()
        })),
        kind if part_kind_matches(kind, &GEMINI_FUNCTION_CALL_PART_KIND_RULES, true) => {
            let record = part.data.as_object().ok_or_else(|| {
                "gemini function_call projection requires object part".to_string()
            })?;
            let name = read_required_string_by_rule(
                record,
                &GEMINI_FUNCTION_CALL_NAME_FIELD_RULE,
                "gemini function_call projection requires function name",
            )?;
            let arguments = read_value_by_rule(record, &GEMINI_FUNCTION_CALL_ARGUMENTS_FIELD_RULE)
                .unwrap_or_else(|| Value::Object(Map::new()));
            let args = normalize_gemini_function_call_args(&arguments);
            let mut function_call = Map::new();
            insert_string_field(
                &mut function_call,
                GEMINI_FUNCTION_CALL_NAME_FIELD_RULE.target_field,
                name,
            );
            insert_value_field(
                &mut function_call,
                GEMINI_FUNCTION_CALL_ARGUMENTS_FIELD_RULE.target_field,
                args,
            );
            if let Some(call_id) =
                read_optional_string_by_rule(record, &GEMINI_FUNCTION_CALL_ID_FIELD_RULE)
            {
                insert_string_field(
                    &mut function_call,
                    GEMINI_FUNCTION_CALL_ID_FIELD_RULE.target_field,
                    call_id,
                );
            }
            Ok(Value::Object(Map::from_iter([(
                "functionCall".to_string(),
                Value::Object(function_call),
            )])))
        }
        other => Err(format!(
            "canonical content part `{other}` cannot be projected to gemini part"
        )),
    }
}

fn normalize_gemini_function_call_args(arguments: &Value) -> Value {
    let parsed = match arguments {
        Value::String(text) => serde_json::from_str::<Value>(text).unwrap_or_else(|_| {
            Value::Object(Map::from_iter([(
                "_raw".to_string(),
                Value::String(text.clone()),
            )]))
        }),
        other => other.clone(),
    };

    match parsed {
        Value::Object(_) => parsed,
        other => Value::Object(Map::from_iter([("value".to_string(), other)])),
    }
}

fn normalize_gemini_function_response_payload(value: &Value) -> Value {
    match value {
        Value::Object(_) => value.clone(),
        other => Value::Object(Map::from_iter([("result".to_string(), other.clone())])),
    }
}

fn resolve_gemini_tool_result_name(
    request: &HubCanonicalRequest,
    tool_result: &crate::HubCanonicalToolResult,
) -> String {
    if let Some(name) = tool_result.raw.as_object().and_then(|record| {
        read_optional_string_by_rule(record, &GEMINI_FUNCTION_RESPONSE_NAME_FIELD_RULE)
    }) {
        return name;
    }

    for message in &request.messages {
        for part in &message.content {
            let Some(record) = part.data.as_object() else {
                continue;
            };
            let matches_call = record
                .get("call_id")
                .and_then(Value::as_str)
                .is_some_and(|call_id| call_id == tool_result.tool_call_id);
            if !matches_call {
                continue;
            }
            if let Some(name) =
                read_optional_string_by_rule(record, &GEMINI_FUNCTION_RESPONSE_NAME_FIELD_RULE)
            {
                return name;
            }
        }
    }

    "tool".to_string()
}

fn normalize_message_role(role: &str, rules: &[CompatRoleRule]) -> Result<&'static str, ()> {
    let normalized = role.trim().to_ascii_lowercase();
    rules
        .iter()
        .find(|rule| rule.canonical_role == normalized)
        .map(|rule| rule.projected_role)
        .ok_or(())
}

fn role_matches_any(role: &str, rules: &[&str], ignore_ascii_case: bool) -> bool {
    let candidate = role.trim();
    rules.iter().any(|rule| {
        if ignore_ascii_case {
            candidate.eq_ignore_ascii_case(rule)
        } else {
            candidate == *rule
        }
    })
}

fn part_kind_matches(kind: &str, rules: &[&str], ignore_ascii_case: bool) -> bool {
    rules.iter().any(|rule| {
        if ignore_ascii_case {
            kind.eq_ignore_ascii_case(rule)
        } else {
            kind == *rule
        }
    })
}

fn extract_canonical_part_text(part: &HubCanonicalContentPart) -> Option<String> {
    part.text
        .as_ref()
        .map(ToOwned::to_owned)
        .or_else(|| {
            part.data
                .as_object()
                .and_then(|record| {
                    ["text", "input_text", "output_text", "output"]
                        .iter()
                        .find_map(|key| record.get(*key).and_then(Value::as_str))
                })
                .map(ToOwned::to_owned)
        })
        .or_else(|| part.data.as_str().map(ToOwned::to_owned))
}

fn build_tool_declaration_object(
    tool: &HubCanonicalToolDefinition,
    rule: &CompatToolDeclarationRule,
    schema: Value,
) -> Result<Value, String> {
    let mut object = Map::new();
    insert_string_field(&mut object, rule.name_field, tool.name.clone());
    if let Some(description) = trimmed_non_empty(Some(tool.description.as_deref().unwrap_or(""))) {
        insert_string_field(&mut object, rule.description_field, description.to_string());
    }
    insert_value_field(&mut object, rule.schema_field, schema);
    Ok(Value::Object(object))
}

fn read_optional_string_by_rule(
    record: &Map<String, Value>,
    rule: &CompatProjectionFieldRule,
) -> Option<String> {
    read_first_string(record, rule.source_keys)
}

fn read_required_string_by_rule(
    record: &Map<String, Value>,
    rule: &CompatProjectionFieldRule,
    error_message: &'static str,
) -> Result<String, String> {
    read_optional_string_by_rule(record, rule).ok_or_else(|| error_message.to_string())
}

fn read_value_by_rule(
    record: &Map<String, Value>,
    rule: &CompatProjectionFieldRule,
) -> Option<Value> {
    rule.source_keys
        .iter()
        .find_map(|key| record.get(*key).cloned())
}

fn insert_string_field(target: &mut Map<String, Value>, field: &str, value: String) {
    target.insert(field.to_string(), Value::String(value));
}

fn insert_value_field(target: &mut Map<String, Value>, field: &str, value: Value) {
    target.insert(field.to_string(), value);
}

fn read_first_string(record: &Map<String, Value>, keys: &[&str]) -> Option<String> {
    keys.iter()
        .filter_map(|key| record.get(*key).and_then(Value::as_str))
        .map(str::trim)
        .find(|value| !value.is_empty())
        .map(ToOwned::to_owned)
}

fn trimmed_non_empty(value: Option<&str>) -> Option<&str> {
    value.map(str::trim).filter(|value| !value.is_empty())
}

fn json_type_name(value: &Value) -> &'static str {
    match value {
        Value::Null => "null",
        Value::Bool(_) => "bool",
        Value::Number(_) => "number",
        Value::String(_) => "string",
        Value::Array(_) => "array",
        Value::Object(_) => "object",
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{lift_responses_request_to_canonical, RequestEnvelope};

    #[test]
    fn request_projection_spec_selects_anthropic_and_gemini_targets() {
        let anthropic = request_projection_spec_for_target("anthropic").expect("anthropic spec");
        assert_eq!(anthropic.target_provider_id, "anthropic");
        assert_eq!(anthropic.operation, "anthropic-messages");
        assert_eq!(anthropic.top_level_rules.len(), 2);

        let gemini = request_projection_spec_for_target("gemini").expect("gemini spec");
        assert_eq!(gemini.target_provider_id, "gemini");
        assert_eq!(gemini.operation, "gemini-chat");
        assert!(gemini.top_level_rules.is_empty());
    }

    #[test]
    fn request_projection_role_rules_cover_anthropic_and_gemini() {
        assert!(is_anthropic_system_role("system"));
        assert!(is_anthropic_system_role("developer"));
        assert_eq!(normalize_anthropic_message_role("tool").unwrap(), "user");
        assert_eq!(
            normalize_anthropic_message_role("assistant").unwrap(),
            "assistant"
        );

        assert!(is_gemini_system_role("system"));
        assert!(is_gemini_system_role("Developer"));
        assert_eq!(normalize_gemini_message_role("assistant").unwrap(), "model");
        assert_eq!(normalize_gemini_message_role("tool").unwrap(), "user");
    }

    #[test]
    fn request_projection_part_kind_rules_cover_text_and_tool_variants() {
        assert!(part_kind_matches(
            "text",
            &ANTHROPIC_TEXT_PART_KIND_RULES,
            false
        ));
        assert!(part_kind_matches(
            "tool_call",
            &ANTHROPIC_TOOL_CALL_PART_KIND_RULES,
            false
        ));
        assert!(part_kind_matches(
            "function_call_output",
            &ANTHROPIC_TOOL_RESULT_PART_KIND_RULES,
            false,
        ));
        assert!(part_kind_matches(
            "output_text",
            &GEMINI_TEXT_PART_KIND_RULES,
            true
        ));
        assert!(part_kind_matches(
            "FUNCTION_CALL",
            &GEMINI_FUNCTION_CALL_PART_KIND_RULES,
            true,
        ));
    }

    #[test]
    fn request_projection_tool_field_rules_cover_anthropic_and_gemini() {
        assert_eq!(ANTHROPIC_TOOL_DECLARATION_RULE.schema_field, "input_schema");
        assert_eq!(GEMINI_FUNCTION_DECLARATION_RULE.schema_field, "parameters");
        assert_eq!(ANTHROPIC_TOOL_CALL_ID_FIELD_RULE.target_field, "id");
        assert!(ANTHROPIC_TOOL_CALL_ID_FIELD_RULE
            .source_keys
            .contains(&"call_id"));
        assert_eq!(
            ANTHROPIC_TOOL_RESULT_ID_FIELD_RULE.target_field,
            "tool_use_id"
        );
        assert_eq!(
            GEMINI_FUNCTION_CALL_ARGUMENTS_FIELD_RULE.target_field,
            "args"
        );
        assert_eq!(
            GEMINI_FUNCTION_RESPONSE_NAME_FIELD_RULE.target_field,
            "name"
        );
    }

    #[test]
    fn request_projection_tool_result_rules_preserve_call_ids_and_names() {
        let anthropic_tool_call = map_tool_call_block(&json!({
            "call_id": "call_lookup_price",
            "function": {
                "name": "lookup_price",
                "arguments": "{\"ticker\":\"AAPL\"}"
            }
        }))
        .expect("anthropic tool call");
        assert_eq!(anthropic_tool_call["id"], "call_lookup_price");
        assert_eq!(anthropic_tool_call["name"], "lookup_price");
        assert_eq!(anthropic_tool_call["input"]["ticker"], "AAPL");

        let anthropic_tool_result = map_tool_result_block(&json!({
            "call_id": "call_lookup_price",
            "content": {"price": 189.10}
        }))
        .expect("anthropic tool result");
        assert_eq!(anthropic_tool_result["tool_use_id"], "call_lookup_price");
        assert_eq!(anthropic_tool_result["content"]["price"], 189.10);

        let gemini_part = map_canonical_part_to_gemini_part(&HubCanonicalContentPart {
            part_type: "function_call".to_string(),
            text: None,
            data: json!({
                "call_id": "call_lookup_price",
                "name": "lookup_price",
                "arguments": "{\"ticker\":\"AAPL\"}"
            }),
        })
        .expect("gemini function call");
        assert_eq!(gemini_part["functionCall"]["id"], "call_lookup_price");
        assert_eq!(gemini_part["functionCall"]["name"], "lookup_price");
        assert_eq!(gemini_part["functionCall"]["args"]["ticker"], "AAPL");
    }

    #[test]
    fn build_request_projection_for_target_keeps_anthropic_and_gemini_shapes_stable() {
        let anthropic_request = lift_responses_request_to_canonical(RequestEnvelope::new(
            "responses",
            r#"{
              "model":"claude-sonnet-4-5",
              "stream":true,
              "metadata":{"trace_id":"phase8-b06"},
              "input":[
                {"type":"message","role":"developer","content":[{"type":"input_text","text":"只回答 JSON"}]},
                {"type":"message","role":"user","content":[{"type":"input_text","text":"继续执行"}]}
              ]
            }"#,
        ))
        .expect("anthropic canonical request");
        let (anthropic_operation, anthropic_body) =
            build_request_projection_for_target("anthropic", &anthropic_request)
                .expect("anthropic projection");
        assert_eq!(anthropic_operation, "anthropic-messages");
        assert_eq!(anthropic_body["model"], "claude-sonnet-4-5");
        assert_eq!(anthropic_body["stream"], true);
        assert_eq!(anthropic_body["system"][0]["text"], "只回答 JSON");
        assert_eq!(anthropic_body["messages"][0]["role"], "user");
        assert_eq!(
            anthropic_body["messages"][0]["content"][0]["text"],
            "继续执行"
        );
        assert_eq!(anthropic_body["metadata"]["trace_id"], "phase8-b06");

        let gemini_request = lift_responses_request_to_canonical(RequestEnvelope::new(
            "responses",
            serde_json::json!({
                "model": "gemini-2.5-pro",
                "input": [
                    {
                        "type": "message",
                        "role": "developer",
                        "content": [{"type": "input_text", "text": "只回答 JSON"}]
                    },
                    {
                        "type": "message",
                        "role": "user",
                        "content": [{"type": "input_text", "text": "查询股价"}]
                    },
                    {
                        "type": "message",
                        "role": "assistant",
                        "content": [{
                            "type": "function_call",
                            "call_id": "call_lookup_price",
                            "name": "lookup_price",
                            "arguments": "{\"ticker\":\"AAPL\"}"
                        }]
                    }
                ],
                "tool_outputs": [
                    {"tool_call_id": "call_lookup_price", "output": "AAPL: 189.10"}
                ],
                "tools": [{
                    "type": "function",
                    "function": {
                        "name": "lookup_price",
                        "description": "查询股价",
                        "parameters": {"type": "object", "properties": {"ticker": {"type": "string"}}}
                    }
                }]
            })
            .to_string(),
        ))
        .expect("gemini canonical request");
        let (gemini_operation, gemini_body) =
            build_request_projection_for_target("gemini", &gemini_request)
                .expect("gemini projection");
        assert_eq!(gemini_operation, "gemini-chat");
        assert_eq!(gemini_body["systemInstruction"]["role"], "system");
        assert_eq!(
            gemini_body["systemInstruction"]["parts"][0]["text"],
            "只回答 JSON"
        );
        assert_eq!(gemini_body["contents"][0]["role"], "user");
        assert_eq!(gemini_body["contents"][0]["parts"][0]["text"], "查询股价");
        assert_eq!(gemini_body["contents"][1]["role"], "model");
        assert_eq!(
            gemini_body["contents"][1]["parts"][0]["functionCall"]["name"],
            "lookup_price"
        );
        assert_eq!(
            gemini_body["contents"][2]["parts"][0]["functionResponse"]["name"],
            "lookup_price"
        );
        assert_eq!(
            gemini_body["tools"][0]["functionDeclarations"][0]["name"],
            "lookup_price"
        );
    }
}
