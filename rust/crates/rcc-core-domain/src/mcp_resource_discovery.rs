use serde_json::Value;

fn read_non_empty_string(value: &Value, out: &mut Vec<String>) {
    if let Some(raw) = value.as_str() {
        let trimmed = raw.trim();
        if !trimmed.is_empty() {
            out.push(trimmed.to_string());
        }
    }
}

pub fn extract_mcp_server_labels_from_output(output: &Value) -> Vec<String> {
    let mut found = Vec::new();

    if let Some(items) = output.as_array() {
        for item in items {
            if item.is_string() {
                read_non_empty_string(item, &mut found);
            } else if let Some(obj) = item.as_object() {
                if let Some(server) = obj.get("server") {
                    read_non_empty_string(server, &mut found);
                }
            }
        }
        return found;
    }

    let Some(obj) = output.as_object() else {
        return found;
    };

    if let Some(servers) = obj.get("servers").and_then(Value::as_array) {
        for server in servers {
            read_non_empty_string(server, &mut found);
        }
    }

    if let Some(resources) = obj.get("resources").and_then(Value::as_array) {
        for resource in resources {
            let Some(resource_obj) = resource.as_object() else {
                continue;
            };
            if let Some(server) = resource_obj.get("server") {
                read_non_empty_string(server, &mut found);
            }
            if let Some(source_server) = resource_obj
                .get("source")
                .and_then(Value::as_object)
                .and_then(|source| source.get("server"))
            {
                read_non_empty_string(source_server, &mut found);
            }
        }
    }

    if let Some(templates) = obj.get("resourceTemplates").and_then(Value::as_array) {
        for template in templates {
            let Some(template_obj) = template.as_object() else {
                continue;
            };
            if let Some(server) = template_obj.get("server") {
                read_non_empty_string(server, &mut found);
            }
            if let Some(source_server) = template_obj
                .get("source")
                .and_then(Value::as_object)
                .and_then(|source| source.get("server"))
            {
                read_non_empty_string(source_server, &mut found);
            }
        }
    }

    found
}

pub fn collect_mcp_servers_from_messages(messages: &[Value]) -> Vec<String> {
    let mut out = Vec::new();

    for message in messages {
        let Some(message_obj) = message.as_object() else {
            continue;
        };
        let role = message_obj
            .get("role")
            .and_then(Value::as_str)
            .map(|value| value.to_lowercase())
            .unwrap_or_default();
        if role != "tool" {
            continue;
        }

        let Some(content) = message_obj.get("content").and_then(Value::as_str) else {
            continue;
        };
        let trimmed = content.trim();
        if trimmed.is_empty() {
            continue;
        }

        let Ok(parsed) = serde_json::from_str::<Value>(trimmed) else {
            continue;
        };

        if let Some(obj) = parsed.as_object() {
            let is_envelope = obj.get("version").and_then(Value::as_str) == Some("rcc.tool.v1");
            let tool_name = obj
                .get("tool")
                .and_then(Value::as_object)
                .and_then(|tool| tool.get("name"))
                .and_then(Value::as_str)
                .map(|value| value.to_lowercase());

            if is_envelope {
                if tool_name.as_deref() != Some("list_mcp_resources") {
                    continue;
                }
                if let Some(output) = obj
                    .get("result")
                    .and_then(Value::as_object)
                    .and_then(|result| result.get("output"))
                {
                    out.extend(extract_mcp_server_labels_from_output(output));
                }
                continue;
            }

            let payload = obj.get("output").unwrap_or(&parsed);
            out.extend(extract_mcp_server_labels_from_output(payload));
        }
    }

    out
}

fn payload_is_empty_mcp_list(payload: &Value) -> bool {
    let Some(obj) = payload.as_object() else {
        return false;
    };

    if obj
        .get("resources")
        .and_then(Value::as_array)
        .is_some_and(|items| items.is_empty())
    {
        return true;
    }

    if obj
        .get("servers")
        .and_then(Value::as_array)
        .is_some_and(|items| items.is_empty())
    {
        return true;
    }

    if let Some(error_obj) = obj.get("error").and_then(Value::as_object) {
        if error_obj.get("code").and_then(Value::as_i64) == Some(-32601) {
            return true;
        }
        if error_obj
            .get("message")
            .and_then(Value::as_str)
            .map(|message| message.to_lowercase().contains("method not found"))
            .unwrap_or(false)
        {
            return true;
        }
    }

    false
}

pub fn detect_empty_mcp_list_from_messages(messages: &[Value]) -> bool {
    for message in messages {
        let Some(message_obj) = message.as_object() else {
            continue;
        };
        let role = message_obj
            .get("role")
            .and_then(Value::as_str)
            .map(|value| value.to_lowercase())
            .unwrap_or_default();
        if role != "tool" {
            continue;
        }

        let Some(content) = message_obj.get("content").and_then(Value::as_str) else {
            continue;
        };
        let trimmed = content.trim();
        if trimmed.is_empty() {
            continue;
        }

        let lowered = trimmed.to_lowercase();
        if lowered.contains("-32601")
            || (lowered.contains("method") && lowered.contains("not found"))
        {
            return true;
        }

        let Ok(parsed) = serde_json::from_str::<Value>(trimmed) else {
            continue;
        };

        let Some(obj) = parsed.as_object() else {
            continue;
        };
        let is_envelope = obj.get("version").and_then(Value::as_str) == Some("rcc.tool.v1");
        let tool_name = obj
            .get("tool")
            .and_then(Value::as_object)
            .and_then(|tool| tool.get("name"))
            .and_then(Value::as_str)
            .map(|value| value.to_lowercase());

        if is_envelope {
            if tool_name.as_deref() != Some("list_mcp_resources") {
                continue;
            }

            if obj
                .get("result")
                .and_then(Value::as_object)
                .and_then(|result| result.get("output"))
                .is_some_and(payload_is_empty_mcp_list)
            {
                return true;
            }
            continue;
        }

        let payload = obj.get("output").unwrap_or(&parsed);
        if payload_is_empty_mcp_list(payload) {
            return true;
        }
    }

    false
}

#[cfg(test)]
mod tests {
    use super::{
        collect_mcp_servers_from_messages, detect_empty_mcp_list_from_messages,
        extract_mcp_server_labels_from_output,
    };
    use serde_json::json;

    #[test]
    fn extracts_server_labels_from_array_and_object_shapes() {
        assert_eq!(
            extract_mcp_server_labels_from_output(&json!([
                "context7",
                {"server": "filesystem"},
                {"server": " "}
            ])),
            vec!["context7", "filesystem"]
        );

        assert_eq!(
            extract_mcp_server_labels_from_output(&json!({
                "servers": ["alpha", "beta"],
                "resources": [
                    {"server": "gamma"},
                    {"source": {"server": "delta"}}
                ],
                "resourceTemplates": [
                    {"server": "epsilon"},
                    {"source": {"server": "zeta"}}
                ]
            })),
            vec!["alpha", "beta", "gamma", "delta", "epsilon", "zeta"]
        );
    }

    #[test]
    fn collects_servers_only_from_tool_messages_and_valid_payloads() {
        let messages = vec![
            json!({"role": "assistant", "content": "{\"servers\":[\"ignored\"]}"}),
            json!({"role": "tool", "content": ""}),
            json!({"role": "tool", "content": "not-json"}),
            json!({
                "role": "tool",
                "content": "{\"version\":\"rcc.tool.v1\",\"tool\":{\"name\":\"list_mcp_resources\"},\"result\":{\"output\":{\"servers\":[\"context7\"],\"resources\":[{\"source\":{\"server\":\"filesystem\"}}]}}}"
            }),
            json!({
                "role": "tool",
                "content": "{\"output\":{\"resourceTemplates\":[{\"server\":\"github\"}]}}"
            }),
        ];

        assert_eq!(
            collect_mcp_servers_from_messages(&messages),
            vec!["context7", "filesystem", "github"]
        );
    }

    #[test]
    fn envelope_with_non_list_mcp_resources_tool_is_ignored() {
        let messages = vec![json!({
            "role": "tool",
            "content": "{\"version\":\"rcc.tool.v1\",\"tool\":{\"name\":\"read_mcp_resource\"},\"result\":{\"output\":{\"servers\":[\"should-not-appear\"]}}}"
        })];

        assert!(collect_mcp_servers_from_messages(&messages).is_empty());
    }

    #[test]
    fn detects_empty_mcp_list_from_plain_text_or_payload_shapes() {
        let text_only = vec![json!({
            "role": "tool",
            "content": "JSON-RPC error -32601 Method not found"
        })];
        assert!(detect_empty_mcp_list_from_messages(&text_only));

        let envelope_empty = vec![json!({
            "role": "tool",
            "content": "{\"version\":\"rcc.tool.v1\",\"tool\":{\"name\":\"list_mcp_resources\"},\"result\":{\"output\":{\"resources\":[]}}}"
        })];
        assert!(detect_empty_mcp_list_from_messages(&envelope_empty));

        let raw_error = vec![json!({
            "role": "tool",
            "content": "{\"output\":{\"error\":{\"code\":-32601,\"message\":\"Method not found\"}}}"
        })];
        assert!(detect_empty_mcp_list_from_messages(&raw_error));
    }

    #[test]
    fn ignores_non_empty_or_irrelevant_messages_when_detecting_empty_lists() {
        let messages = vec![
            json!({
                "role": "tool",
                "content": "{\"version\":\"rcc.tool.v1\",\"tool\":{\"name\":\"read_mcp_resource\"},\"result\":{\"output\":{\"resources\":[]}}}"
            }),
            json!({
                "role": "tool",
                "content": "{\"output\":{\"servers\":[\"context7\"]}}"
            }),
            json!({"role": "assistant", "content": "method not found"}),
        ];

        assert!(!detect_empty_mcp_list_from_messages(&messages));
    }
}
