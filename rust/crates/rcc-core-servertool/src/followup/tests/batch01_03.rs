use crate::followup::build_followup_request;
use serde_json::json;

#[test]
fn builds_canonical_followup_request_from_captured_seed() {
    let long_tool_output = "x".repeat(180);
    let payload = json!({
        "captured": {
            "model": "seed-model",
            "messages": [
                {"role": "system", "content": "sys"},
                {"role": "user", "content": "older user"},
                {"role": "assistant", "tool_calls": [{"id": "call-1", "type": "function", "function": {"name": "lookup", "arguments": "{}"}}]},
                {"role": "tool", "tool_call_id": "call-1", "name": "lookup", "content": long_tool_output},
                {"role": "assistant", "content": "tool done"},
                {"role": "user", "content": "latest user"}
            ],
            "tools": [
                {"type": "function", "function": {"name": "reasoning.stop"}},
                {"type": "function", "function": {"name": "keep"}}
            ],
            "temperature": 0.2,
            "max_tokens": 256
        },
        "adapter_context": {"assignedModelId": "gpt-5"},
        "followup_text": "<** stopMessage: continue **>\n[Time/Date]: 2026-04-18\n继续执行\n[Image omitted]",
        "max_non_system_messages": 3,
        "tool_content_max_chars": 64,
        "drop_tool_name": "reasoning.stop"
    });

    let result = build_followup_request(&payload).expect("followup request");
    assert_eq!(result["model"], json!("gpt-5"));
    assert_eq!(result["parameters"]["temperature"], json!(0.2));
    assert_eq!(result["parameters"]["max_output_tokens"], json!(256));
    assert_eq!(result["tools"].as_array().expect("tools").len(), 1);
    assert_eq!(result["tools"][0]["function"]["name"], json!("keep"));

    let messages = result["messages"].as_array().expect("messages");
    assert_eq!(messages.last().expect("last")["role"], json!("user"));
    assert_eq!(messages.last().expect("last")["content"], json!("继续执行"));
    assert!(messages
        .iter()
        .any(|entry| entry["role"] == json!("system")));
    assert!(messages.iter().any(|entry| {
        entry["role"] == json!("tool")
            && entry["content"]
                .as_str()
                .is_some_and(|value| value.contains("[tool_output_compacted omitted="))
    }));
}

#[test]
fn appends_assistant_and_tool_output_messages_before_final_user_message() {
    let payload = json!({
        "captured": {
            "model": "seed-model",
            "messages": [{"role": "user", "content": "start"}]
        },
        "adapter_context": {"assignedModelId": "gpt-5"},
        "chat_response": {
            "choices": [{"message": {"role": "assistant", "content": "tool done"}}],
            "tool_outputs": [
                {"tool_call_id": "call-1", "name": "lookup", "content": {"ok": true, "count": 2}}
            ]
        },
        "append_assistant_message": true,
        "append_tool_messages_from_tool_outputs": true,
        "followup_text": "继续执行",
        "tool_content_max_chars": 64
    });

    let result = build_followup_request(&payload).expect("followup request");
    let messages = result["messages"].as_array().expect("messages");
    assert_eq!(messages[1]["role"], json!("assistant"));
    assert_eq!(messages[1]["content"], json!("tool done"));
    assert_eq!(messages[2]["role"], json!("tool"));
    assert_eq!(messages[2]["tool_call_id"], json!("call-1"));
    assert_eq!(messages[2]["name"], json!("lookup"));
    assert!(messages[2]["content"]
        .as_str()
        .expect("tool content")
        .contains("{\"count\":2,\"ok\":true}"));
    assert_eq!(messages[3]["role"], json!("user"));
    assert_eq!(messages[3]["content"], json!("继续执行"));
}

#[test]
fn assistant_injection_uses_output_text_fallback() {
    let payload = json!({
        "captured": {"model": "gpt-5", "messages": []},
        "chat_response": {"output_text": "  fallback reply  "},
        "append_assistant_message": true,
        "followup_text": "继续执行"
    });

    let result = build_followup_request(&payload).expect("followup request");
    let messages = result["messages"].as_array().expect("messages");
    assert_eq!(messages[0]["role"], json!("assistant"));
    assert_eq!(messages[0]["content"], json!("fallback reply"));
    assert_eq!(messages[1]["content"], json!("继续执行"));
}

#[test]
fn returns_none_when_required_injection_is_missing() {
    let missing_assistant = json!({
        "captured": {"model": "gpt-5", "messages": []},
        "append_assistant_message": true,
        "followup_text": "继续执行"
    });
    assert!(build_followup_request(&missing_assistant).is_none());

    let missing_tool_outputs = json!({
        "captured": {"model": "gpt-5", "messages": []},
        "chat_response": {"choices": [{"message": {"role": "assistant", "content": "done"}}]},
        "append_tool_messages_from_tool_outputs": true,
        "followup_text": "继续执行"
    });
    assert!(build_followup_request(&missing_tool_outputs).is_none());
}

#[test]
fn optional_injection_can_be_skipped_without_failing() {
    let payload = json!({
        "captured": {"model": "gpt-5", "messages": []},
        "append_tool_messages_from_tool_outputs": {"required": false},
        "followup_text": "继续执行"
    });

    let result = build_followup_request(&payload).expect("followup request");
    let messages = result["messages"].as_array().expect("messages");
    assert_eq!(messages.len(), 1);
    assert_eq!(messages[0]["role"], json!("user"));
    assert_eq!(messages[0]["content"], json!("继续执行"));
}

#[test]
fn injects_system_text_after_existing_leading_system_messages() {
    let payload = json!({
        "captured": {
            "model": "gpt-5",
            "messages": [
                {"role": "system", "content": "sys-1"},
                {"role": "system", "content": "sys-2"},
                {"role": "user", "content": "start"}
            ]
        },
        "inject_system_text": {"text": "继续使用 stopless 模式"},
        "followup_text": "继续执行"
    });

    let result = build_followup_request(&payload).expect("followup request");
    let messages = result["messages"].as_array().expect("messages");
    assert_eq!(messages[0]["content"], json!("sys-1"));
    assert_eq!(messages[1]["content"], json!("sys-2"));
    assert_eq!(messages[2]["role"], json!("system"));
    assert_eq!(messages[2]["content"], json!("继续使用 stopless 模式"));
    assert_eq!(messages[3]["role"], json!("user"));
    assert_eq!(messages[3]["content"], json!("start"));
    assert_eq!(messages[4]["content"], json!("继续执行"));
}

#[test]
fn ignores_blank_system_text_injection() {
    let payload = json!({
        "captured": {
            "model": "gpt-5",
            "messages": [{"role": "user", "content": "start"}]
        },
        "inject_system_text": "   ",
        "followup_text": "继续执行"
    });

    let result = build_followup_request(&payload).expect("followup request");
    let messages = result["messages"].as_array().expect("messages");
    assert_eq!(messages.len(), 2);
    assert_eq!(messages[0]["role"], json!("user"));
    assert_eq!(messages[0]["content"], json!("start"));
    assert_eq!(messages[1]["content"], json!("继续执行"));
}

#[test]
fn injects_vision_summary_into_image_parts() {
    let payload = json!({
        "captured": {
            "model": "gpt-5",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": "看看这张图"},
                        {"type": "input_image", "image_url": "file://cat.png"}
                    ]
                }
            ]
        },
        "inject_vision_summary": {"summary": "图中是一只猫"},
        "followup_text": "继续执行"
    });

    let result = build_followup_request(&payload).expect("followup request");
    let parts = result["messages"][0]["content"].as_array().expect("parts");
    assert_eq!(parts[0]["type"], json!("input_text"));
    assert_eq!(parts[1], json!({"type": "text", "text": "[Image omitted]"}));
    assert_eq!(
        parts[2],
        json!({"type": "text", "text": "[Vision] 图中是一只猫"})
    );
    assert_eq!(result["messages"][1]["content"], json!("继续执行"));
}

#[test]
fn injects_vision_summary_into_last_user_string_when_no_image_parts_exist() {
    let payload = json!({
        "captured": {
            "model": "gpt-5",
            "messages": [
                {"role": "assistant", "content": "done"},
                {"role": "user", "content": "原始内容"}
            ]
        },
        "inject_vision_summary": "图中是一只猫",
        "followup_text": "继续执行"
    });

    let result = build_followup_request(&payload).expect("followup request");
    assert_eq!(
        result["messages"][1]["content"],
        json!("原始内容\n[Vision] 图中是一只猫")
    );
    assert_eq!(result["messages"][2]["content"], json!("继续执行"));
}

#[test]
fn injects_vision_summary_into_last_user_array_when_no_image_parts_exist() {
    let payload = json!({
        "captured": {
            "model": "gpt-5",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "已有文本"}
                    ]
                }
            ]
        },
        "inject_vision_summary": {"summary": "图中是一只猫"},
        "followup_text": "继续执行"
    });

    let result = build_followup_request(&payload).expect("followup request");
    let parts = result["messages"][0]["content"].as_array().expect("parts");
    assert_eq!(parts[0], json!({"type": "text", "text": "已有文本"}));
    assert_eq!(
        parts[1],
        json!({"type": "text", "text": "[Vision] 图中是一只猫"})
    );
    assert_eq!(result["messages"][1]["content"], json!("继续执行"));
}

#[test]
fn injects_vision_summary_by_creating_user_message_when_missing() {
    let payload = json!({
        "captured": {
            "model": "gpt-5",
            "messages": [{"role": "assistant", "content": "done"}]
        },
        "inject_vision_summary": {"summary": "图中是一只猫"},
        "followup_text": "继续执行"
    });

    let result = build_followup_request(&payload).expect("followup request");
    let messages = result["messages"].as_array().expect("messages");
    assert_eq!(messages[1]["role"], json!("user"));
    assert_eq!(messages[1]["content"], json!("[Vision] 图中是一只猫"));
    assert_eq!(messages[2]["content"], json!("继续执行"));
}

#[test]
fn combines_system_vision_assistant_tool_and_final_user_in_fixed_order() {
    let payload = json!({
        "captured": {
            "model": "gpt-5",
            "messages": [
                {"role": "system", "content": "sys-1"},
                {"role": "system", "content": "sys-2"},
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": "请看图片"},
                        {"type": "input_image", "image_url": "file://board.png"}
                    ]
                }
            ]
        },
        "inject_system_text": "继续使用 stopless 模式",
        "inject_vision_summary": {"summary": "白板上有任务列表"},
        "chat_response": {
            "choices": [{"message": {"role": "assistant", "content": "done"}}],
            "tool_outputs": [{"tool_call_id": "call-1", "content": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"}]
        },
        "append_assistant_message": true,
        "append_tool_messages_from_tool_outputs": true,
        "tool_content_max_chars": 64,
        "followup_text": "继续执行"
    });

    let result = build_followup_request(&payload).expect("followup request");
    let messages = result["messages"].as_array().expect("messages");
    assert_eq!(messages[0]["content"], json!("sys-1"));
    assert_eq!(messages[1]["content"], json!("sys-2"));
    assert_eq!(messages[2]["role"], json!("system"));
    assert_eq!(messages[2]["content"], json!("继续使用 stopless 模式"));
    assert_eq!(messages[3]["role"], json!("user"));
    let parts = messages[3]["content"].as_array().expect("vision parts");
    assert_eq!(parts[1], json!({"type": "text", "text": "[Image omitted]"}));
    assert_eq!(
        parts[2],
        json!({"type": "text", "text": "[Vision] 白板上有任务列表"})
    );
    assert_eq!(messages[4]["role"], json!("assistant"));
    assert_eq!(messages[4]["content"], json!("done"));
    assert_eq!(messages[5]["role"], json!("tool"));
    assert!(messages[5]["content"]
        .as_str()
        .expect("tool content")
        .contains("[tool_output_compacted omitted="));
    assert_eq!(messages[6]["role"], json!("user"));
    assert_eq!(messages[6]["content"], json!("继续执行"));
}
