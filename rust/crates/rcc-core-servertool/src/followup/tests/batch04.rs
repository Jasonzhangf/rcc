use crate::followup::build_followup_request;
use crate::reasoning_stop::reasoning_stop_tool_definition;
use serde_json::json;

#[test]
fn ensure_standard_tools_keeps_empty_tools_surface_empty() {
    let payload = json!({
        "captured": {
            "model": "gpt-5",
            "messages": [],
            "tools": []
        },
        "ensure_standard_tools": true,
        "inject_system_text": { "text": "继续使用 stopless 模式" },
        "followup_text": "继续执行"
    });

    let result = build_followup_request(&payload).expect("followup request");
    assert!(result.get("tools").is_none());
}

#[test]
fn ensure_standard_tools_appends_reasoning_stop_when_stopless_is_requested() {
    let payload = json!({
        "captured": {
            "model": "gpt-5",
            "messages": [],
            "tools": [
                {"type": "function", "function": {"name": "lookup"}}
            ]
        },
        "ensure_standard_tools": true,
        "inject_system_text": { "text": "继续使用 stopless 模式" },
        "followup_text": "继续执行"
    });

    let result = build_followup_request(&payload).expect("followup request");
    let tools = result["tools"].as_array().expect("tools");
    assert_eq!(tools.len(), 2);
    assert_eq!(tools[0]["function"]["name"], json!("lookup"));
    assert_eq!(tools[1]["function"]["name"], json!("reasoning.stop"));
    assert_eq!(
        tools[1]["function"]["parameters"]["required"],
        json!(["task_goal", "is_completed"])
    );
    assert_eq!(tools[1], reasoning_stop_tool_definition());
}

#[test]
fn ensure_standard_tools_does_not_duplicate_existing_reasoning_stop() {
    let payload = json!({
        "captured": {
            "model": "gpt-5",
            "messages": [],
            "tools": [
                {"type": "function", "function": {"name": "reasoning.stop"}},
                {"type": "function", "function": {"name": "lookup"}}
            ]
        },
        "ensure_standard_tools": true,
        "followup_text": "调用 reasoning.stop 以后继续"
    });

    let result = build_followup_request(&payload).expect("followup request");
    let tools = result["tools"].as_array().expect("tools");
    assert_eq!(tools.len(), 2);
    assert_eq!(tools[0]["function"]["name"], json!("reasoning.stop"));
    assert_eq!(tools[1]["function"]["name"], json!("lookup"));
}

#[test]
fn force_tool_choice_sets_parameters_and_disables_parallel_for_function_choice() {
    let payload = json!({
        "captured": {
            "model": "gpt-5",
            "messages": [],
            "parameters": { "parallel_tool_calls": true, "temperature": 0.2 }
        },
        "force_tool_choice": {
            "value": { "type": "function", "function": { "name": "lookup" } }
        },
        "followup_text": "继续执行"
    });

    let result = build_followup_request(&payload).expect("followup request");
    assert_eq!(
        result["parameters"]["tool_choice"],
        json!({ "type": "function", "function": { "name": "lookup" } })
    );
    assert_eq!(result["parameters"]["parallel_tool_calls"], json!(false));
    assert_eq!(result["parameters"]["temperature"], json!(0.2));
}

#[test]
fn force_tool_choice_clear_removes_tool_choice() {
    let payload = json!({
        "captured": {
            "model": "gpt-5",
            "messages": [],
            "parameters": {
                "tool_choice": "required",
                "parallel_tool_calls": true,
                "temperature": 0.2
            }
        },
        "force_tool_choice": { "clear": true },
        "followup_text": "继续执行"
    });

    let result = build_followup_request(&payload).expect("followup request");
    assert!(result["parameters"].get("tool_choice").is_none());
    assert_eq!(result["parameters"]["parallel_tool_calls"], json!(true));
    assert_eq!(result["parameters"]["temperature"], json!(0.2));
}

#[test]
fn append_tool_if_missing_appends_only_when_missing_and_creates_tools_when_absent() {
    let with_existing_tools = json!({
        "captured": {
            "model": "gpt-5",
            "messages": [],
            "tools": [
                {"type": "function", "function": {"name": "lookup"}}
            ]
        },
        "append_tool_if_missing": {
            "tool_name": "reasoning.stop",
            "tool_definition": {"type": "function", "function": {"name": "reasoning.stop"}}
        },
        "followup_text": "继续执行"
    });

    let result = build_followup_request(&with_existing_tools).expect("followup request");
    let tools = result["tools"].as_array().expect("tools");
    assert_eq!(tools.len(), 2);
    assert_eq!(tools[1]["function"]["name"], json!("reasoning.stop"));

    let duplicate = json!({
        "captured": {
            "model": "gpt-5",
            "messages": [],
            "tools": [
                {"type": "function", "function": {"name": "reasoning.stop"}}
            ]
        },
        "append_tool_if_missing": {
            "tool_name": "reasoning.stop",
            "tool_definition": {"type": "function", "function": {"name": "reasoning.stop"}}
        },
        "followup_text": "继续执行"
    });

    let duplicate_result = build_followup_request(&duplicate).expect("followup request");
    assert_eq!(
        duplicate_result["tools"].as_array().expect("tools").len(),
        1
    );

    let without_tools = json!({
        "captured": {
            "model": "gpt-5",
            "messages": []
        },
        "append_tool_if_missing": {
            "tool_name": "reasoning.stop",
            "tool_definition": {"type": "function", "function": {"name": "reasoning.stop"}}
        },
        "followup_text": "继续执行"
    });

    let without_tools_result = build_followup_request(&without_tools).expect("followup request");
    let tools = without_tools_result["tools"].as_array().expect("tools");
    assert_eq!(tools.len(), 1);
    assert_eq!(tools[0]["function"]["name"], json!("reasoning.stop"));
}

#[test]
fn combines_tool_governance_with_existing_followup_chain() {
    let payload = json!({
        "captured": {
            "model": "gpt-5",
            "messages": [
                {"role": "user", "content": "start"}
            ],
            "tools": [
                {"type": "function", "function": {"name": "lookup"}}
            ],
            "parameters": {
                "parallel_tool_calls": true
            }
        },
        "inject_system_text": { "text": "继续使用 stopless 模式" },
        "chat_response": {
            "choices": [{"message": {"role": "assistant", "content": "done"}}],
            "tool_outputs": [{"tool_call_id": "call-1", "content": {"ok": true}}]
        },
        "append_assistant_message": true,
        "append_tool_messages_from_tool_outputs": true,
        "ensure_standard_tools": true,
        "force_tool_choice": {
            "value": { "type": "function", "function": { "name": "lookup" } }
        },
        "append_tool_if_missing": {
            "tool_name": "extra.tool",
            "tool_definition": {"type": "function", "function": {"name": "extra.tool"}}
        },
        "followup_text": "继续执行"
    });

    let result = build_followup_request(&payload).expect("followup request");
    let messages = result["messages"].as_array().expect("messages");
    assert_eq!(messages[0]["role"], json!("system"));
    assert_eq!(messages[1]["role"], json!("user"));
    assert_eq!(messages[2]["role"], json!("assistant"));
    assert_eq!(messages[3]["role"], json!("tool"));
    assert_eq!(messages[4]["role"], json!("user"));

    let tools = result["tools"].as_array().expect("tools");
    assert_eq!(tools.len(), 3);
    assert_eq!(tools[0]["function"]["name"], json!("lookup"));
    assert_eq!(tools[1]["function"]["name"], json!("reasoning.stop"));
    assert_eq!(tools[2]["function"]["name"], json!("extra.tool"));
    assert_eq!(
        result["parameters"]["tool_choice"],
        json!({ "type": "function", "function": { "name": "lookup" } })
    );
    assert_eq!(result["parameters"]["parallel_tool_calls"], json!(false));
}

#[test]
fn returns_none_when_model_or_followup_text_missing() {
    let missing_model = json!({
        "captured": {"messages": []},
        "followup_text": "继续执行"
    });
    assert!(build_followup_request(&missing_model).is_none());

    let missing_text = json!({
        "captured": {"model": "gpt-5", "messages": []},
        "followup_text": "   "
    });
    assert!(build_followup_request(&missing_text).is_none());
}
