use serde_json::{json, Value};

use crate::{analyze_media_attachments, get_latest_user_message_index};

#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct RouterFeatureHints {
    pub has_image_attachment: bool,
    pub has_video_attachment: bool,
    pub has_remote_video_attachment: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct RouterRequestHints {
    pub explicit_target_block: Option<String>,
    pub requested_route: Option<String>,
    pub classification_candidates: Vec<String>,
    pub features: RouterFeatureHints,
}

pub fn normalize_router_request_payload(payload: &str) -> Value {
    let trimmed = payload.trim();
    if trimmed.is_empty() {
        return json!({});
    }

    match serde_json::from_str::<Value>(trimmed) {
        Ok(Value::Object(map)) => Value::Object(map),
        Ok(Value::Array(items)) => json!({ "input": items }),
        Ok(Value::String(text)) => json!({ "input": text }),
        Ok(other) => json!({ "payload": other }),
        Err(_) => json!({ "input": trimmed }),
    }
}

pub fn extract_router_request_hints(payload: &Value) -> RouterRequestHints {
    RouterRequestHints {
        explicit_target_block: extract_explicit_target_block(payload),
        requested_route: extract_requested_route(payload),
        classification_candidates: extract_classification_candidates(payload),
        features: extract_router_feature_hints(payload),
    }
}

fn extract_explicit_target_block(payload: &Value) -> Option<String> {
    first_nonempty_string([
        payload.get("target_block"),
        payload
            .get("route")
            .and_then(|route| route.get("target_block")),
        payload
            .get("routing")
            .and_then(|routing| routing.get("target_block")),
    ])
    .and_then(|block| normalize_target_block(&block))
}

fn extract_requested_route(payload: &Value) -> Option<String> {
    if let Some(route_record) = payload.get("route").and_then(Value::as_object) {
        if let Some(name) = route_record.get("name") {
            if let Some(value) = trim_nonempty_string(name) {
                return Some(value);
            }
        }
    }

    first_nonempty_string([
        payload.get("requested_route"),
        payload.get("route"),
        payload
            .get("routing")
            .and_then(|routing| routing.get("route")),
        payload
            .get("routing")
            .and_then(|routing| routing.get("requested_route")),
    ])
}

fn extract_classification_candidates(payload: &Value) -> Vec<String> {
    let mut values = Vec::new();
    append_string_array(
        &mut values,
        payload
            .get("classification_candidates")
            .and_then(Value::as_array),
    );
    append_string_array(
        &mut values,
        payload.get("route_candidates").and_then(Value::as_array),
    );
    append_string_array(
        &mut values,
        payload
            .get("routing")
            .and_then(|routing| routing.get("classification_candidates"))
            .and_then(Value::as_array),
    );
    dedupe_nonempty_strings(values)
}

fn extract_router_feature_hints(payload: &Value) -> RouterFeatureHints {
    let signals = latest_message_media_signals(payload)
        .or_else(|| responses_input_media_signals(payload))
        .unwrap_or_else(crate::MediaAttachmentSignals::empty);

    RouterFeatureHints {
        has_image_attachment: signals.has_image,
        has_video_attachment: signals.has_video,
        has_remote_video_attachment: signals.has_remote_video,
    }
}

fn latest_message_media_signals(payload: &Value) -> Option<crate::MediaAttachmentSignals> {
    let messages = payload.get("messages")?.as_array()?;
    let index = get_latest_user_message_index(messages)?;
    let message = messages.get(index)?;
    Some(analyze_media_attachments(Some(message)))
}

fn responses_input_media_signals(payload: &Value) -> Option<crate::MediaAttachmentSignals> {
    let input = payload.get("input")?;
    let content = match input {
        Value::Array(items) => Value::Array(items.clone()),
        Value::Object(_) => Value::Array(vec![input.clone()]),
        _ => return None,
    };
    let synthetic_message = json!({
        "role": "user",
        "content": content,
    });
    Some(analyze_media_attachments(Some(&synthetic_message)))
}

fn append_string_array(out: &mut Vec<String>, values: Option<&Vec<Value>>) {
    let Some(values) = values else {
        return;
    };

    for value in values {
        if let Some(text) = trim_nonempty_string(value) {
            out.push(text);
        }
    }
}

fn dedupe_nonempty_strings(values: Vec<String>) -> Vec<String> {
    let mut unique = Vec::new();
    for value in values {
        if !value.is_empty() && !unique.contains(&value) {
            unique.push(value);
        }
    }
    unique
}

fn first_nonempty_string<'a>(
    values: impl IntoIterator<Item = Option<&'a Value>>,
) -> Option<String> {
    for value in values {
        if let Some(value) = value.and_then(trim_nonempty_string) {
            return Some(value);
        }
    }
    None
}

fn trim_nonempty_string(value: &Value) -> Option<String> {
    value
        .as_str()
        .map(str::trim)
        .filter(|text| !text.is_empty())
        .map(str::to_string)
}

fn normalize_target_block(value: &str) -> Option<String> {
    let normalized = value.trim().to_lowercase();
    match normalized.as_str() {
        "pipeline" | "servertool" => Some(normalized),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::{
        extract_router_request_hints, normalize_router_request_payload, RouterFeatureHints,
    };

    #[test]
    fn normalize_router_request_payload_defaults_empty_to_object() {
        assert_eq!(normalize_router_request_payload(""), json!({}));
    }

    #[test]
    fn normalize_router_request_payload_wraps_plain_text_as_input() {
        assert_eq!(
            normalize_router_request_payload("continue"),
            json!({ "input": "continue" })
        );
    }

    #[test]
    fn normalize_router_request_payload_preserves_object_payload() {
        assert_eq!(
            normalize_router_request_payload(r#"{"model":"gpt-5"}"#),
            json!({ "model": "gpt-5" })
        );
    }

    #[test]
    fn extract_router_request_hints_reads_route_and_target_block() {
        let hints = extract_router_request_hints(&json!({
            "routing": {
                "route": "tools",
                "classification_candidates": ["tools", "default"],
                "target_block": "pipeline"
            }
        }));

        assert_eq!(hints.explicit_target_block.as_deref(), Some("pipeline"));
        assert_eq!(hints.requested_route.as_deref(), Some("tools"));
        assert_eq!(
            hints.classification_candidates,
            vec!["tools".to_string(), "default".to_string()]
        );
    }

    #[test]
    fn extract_router_request_hints_detects_media_from_chat_messages() {
        let hints = extract_router_request_hints(&json!({
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_image",
                            "image_url": "file://board.png"
                        }
                    ]
                }
            ]
        }));

        assert_eq!(
            hints.features,
            RouterFeatureHints {
                has_image_attachment: true,
                has_video_attachment: false,
                has_remote_video_attachment: false,
            }
        );
    }

    #[test]
    fn extract_router_request_hints_detects_media_from_responses_input() {
        let hints = extract_router_request_hints(&json!({
            "input": [
                {
                    "type": "input_video",
                    "video_url": "https://cdn.example.com/demo.mp4"
                }
            ]
        }));

        assert_eq!(
            hints.features,
            RouterFeatureHints {
                has_image_attachment: false,
                has_video_attachment: true,
                has_remote_video_attachment: true,
            }
        );
    }
}
