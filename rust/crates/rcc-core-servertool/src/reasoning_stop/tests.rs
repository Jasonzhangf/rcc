use super::{
    build_clear_reasoning_stop_state_result, build_reasoning_stop_mode_sync_result,
    build_reasoning_stop_state_patch, build_reasoning_stop_tool_output,
    increment_reasoning_stop_fail_count, load_reasoning_stop_sticky_state,
    read_reasoning_stop_fail_count, read_reasoning_stop_state_view, reasoning_stop_tool_definition,
    reset_reasoning_stop_fail_count, save_reasoning_stop_sticky_state,
};
use serde_json::{json, Value};
use std::fs;
use std::path::{Path, PathBuf};
use std::process;
use std::time::{SystemTime, UNIX_EPOCH};

fn parse_tool_output_content(result: &Value) -> Value {
    serde_json::from_str(result["content"].as_str().expect("content string")).expect("json")
}

#[test]
fn tool_definition_exposes_reasoning_stop_contract() {
    let tool = reasoning_stop_tool_definition();
    assert_eq!(tool["function"]["name"], json!("reasoning.stop"));
    assert_eq!(
        tool["function"]["parameters"]["required"],
        json!(["task_goal", "is_completed"])
    );
}

#[test]
fn missing_task_goal_returns_error_tool_output() {
    let payload = json!({
        "tool_call": {
            "id": "call_1",
            "name": "reasoning.stop",
            "arguments": "{\"is_completed\":false,\"next_step\":\"继续\"}"
        }
    });

    let result = build_reasoning_stop_tool_output(&payload).expect("tool output");
    assert_eq!(result["tool_call_id"], json!("call_1"));
    let content = parse_tool_output_content(&result);
    assert_eq!(content["ok"], json!(false));
    assert_eq!(content["code"], json!("TASK_GOAL_REQUIRED"));
}

#[test]
fn completed_without_completion_evidence_returns_error_tool_output() {
    let payload = json!({
        "tool_call": {
            "id": "call_1",
            "name": "reasoning.stop",
            "arguments": "{\"task_goal\":\"完成 batch06\",\"is_completed\":true}"
        }
    });

    let result = build_reasoning_stop_tool_output(&payload).expect("tool output");
    let content = parse_tool_output_content(&result);
    assert_eq!(content["ok"], json!(false));
    assert_eq!(content["code"], json!("COMPLETION_EVIDENCE_REQUIRED"));
}

#[test]
fn next_step_only_payload_builds_success_tool_output() {
    let payload = json!({
        "tool_call": {
            "id": "call_1",
            "name": "reasoning.stop",
            "arguments": "{\"task_goal\":\"完成 batch06\",\"is_completed\":false,\"next_step\":\"补测试\",\"learning\":\"保持 block 薄\"}"
        }
    });

    let result = build_reasoning_stop_tool_output(&payload).expect("tool output");
    let content = parse_tool_output_content(&result);
    assert_eq!(content["ok"], json!(true));
    let summary = content["summary"].as_str().expect("summary");
    assert!(summary.contains("用户任务目标: 完成 batch06"));
    assert!(summary.contains("是否完成: 否"));
    assert!(summary.contains("下一步: 补测试"));
    assert!(summary.contains("经验沉淀: 保持 block 薄"));
}

#[test]
fn alias_keys_are_normalized_for_success_summary() {
    let payload = json!({
        "tool_call": {
            "id": "call_1",
            "name": "reasoning.stop",
            "arguments": "{\"goal\":\"完成 batch06\",\"completed\":false,\"nextStep\":\"补测试\",\"reasonType\":\"blocked\"}"
        }
    });

    let result = build_reasoning_stop_tool_output(&payload).expect("tool output");
    let content = parse_tool_output_content(&result);
    assert_eq!(content["ok"], json!(true));
    let summary = content["summary"].as_str().expect("summary");
    assert!(summary.contains("停止原因: blocked"));
    assert!(summary.contains("下一步: 补测试"));
}

#[test]
fn user_input_requires_cannot_complete_reason_and_question() {
    let payload = json!({
        "tool_call": {
            "id": "call_1",
            "name": "reasoning.stop",
            "arguments": "{\"task_goal\":\"完成 batch06\",\"is_completed\":false,\"user_input_required\":true}"
        }
    });

    let result = build_reasoning_stop_tool_output(&payload).expect("tool output");
    let content = parse_tool_output_content(&result);
    assert_eq!(content["ok"], json!(false));
    assert_eq!(
        content["code"],
        json!("CANNOT_COMPLETE_REASON_REQUIRED_FOR_USER_INPUT")
    );
}

#[test]
fn blocked_stop_requires_attempts_exhausted_and_blocking_evidence() {
    let payload = json!({
        "tool_call": {
            "id": "call_1",
            "name": "reasoning.stop",
            "arguments": "{\"task_goal\":\"完成 batch06\",\"is_completed\":false,\"cannot_complete_reason\":\"provider down\"}"
        }
    });

    let result = build_reasoning_stop_tool_output(&payload).expect("tool output");
    let content = parse_tool_output_content(&result);
    assert_eq!(content["ok"], json!(false));
    assert_eq!(content["code"], json!("ATTEMPTS_EXHAUSTED_REQUIRED"));

    let payload = json!({
        "tool_call": {
            "id": "call_1",
            "name": "reasoning.stop",
            "arguments": "{\"task_goal\":\"完成 batch06\",\"is_completed\":false,\"cannot_complete_reason\":\"provider down\",\"attempts_exhausted\":true}"
        }
    });
    let result = build_reasoning_stop_tool_output(&payload).expect("tool output");
    let content = parse_tool_output_content(&result);
    assert_eq!(content["ok"], json!(false));
    assert_eq!(content["code"], json!("BLOCKING_EVIDENCE_REQUIRED"));
}

#[test]
fn missing_tool_call_or_wrong_name_returns_none() {
    assert!(build_reasoning_stop_tool_output(&json!({})).is_none());
    assert!(build_reasoning_stop_tool_output(&json!({
        "tool_call": { "id": "call_1", "name": "other.tool", "arguments": "{}" }
    }))
    .is_none());
}

#[test]
fn explicit_summary_builds_reasoning_stop_state_patch() {
    let result = build_reasoning_stop_state_patch(&json!({
        "summary": "  用户任务目标: 完成 batch07\n是否完成: 否\n下一步: 补测试  ",
        "base_state": { "native": true },
        "updated_at": 123.9
    }))
    .expect("state patch");

    assert_eq!(result["native"], json!(true));
    assert_eq!(result["reasoningStopArmed"], json!(true));
    assert_eq!(
        result["reasoningStopSummary"],
        json!("用户任务目标: 完成 batch07\n是否完成: 否\n下一步: 补测试")
    );
    assert_eq!(result["reasoningStopUpdatedAt"], json!(123));
}

#[test]
fn blank_summary_falls_back_to_success_tool_output() {
    let tool_output = build_reasoning_stop_tool_output(&json!({
        "tool_call": {
            "id": "call_1",
            "name": "reasoning.stop",
            "arguments": "{\"task_goal\":\"完成 batch07\",\"is_completed\":false,\"next_step\":\"补测试\"}"
        }
    }))
    .expect("tool output");

    let result = build_reasoning_stop_state_patch(&json!({
        "summary": "   ",
        "tool_output": tool_output,
        "updated_at": 9
    }))
    .expect("state patch");

    assert_eq!(result["reasoningStopArmed"], json!(true));
    let summary = result["reasoningStopSummary"].as_str().expect("summary");
    assert!(summary.contains("用户任务目标: 完成 batch07"));
    assert_eq!(result["reasoningStopUpdatedAt"], json!(9));
}

#[test]
fn invalid_tool_output_does_not_build_state_patch() {
    assert!(build_reasoning_stop_state_patch(&json!({
        "tool_output": {
            "tool_call_id": "call_1",
            "name": "reasoning.stop",
            "content": "{\"ok\":false,\"code\":\"TASK_GOAL_REQUIRED\"}"
        }
    }))
    .is_none());
}

#[test]
fn long_summary_is_trimmed_to_limit() {
    let long_summary = "a".repeat(4500);
    let result = build_reasoning_stop_state_patch(&json!({
        "summary": long_summary,
        "updated_at": 1
    }))
    .expect("state patch");

    assert_eq!(
        result["reasoningStopSummary"]
            .as_str()
            .expect("summary")
            .chars()
            .count(),
        4000
    );
}

#[test]
fn read_reasoning_stop_state_view_returns_canonical_snapshot() {
    let result = read_reasoning_stop_state_view(&json!({
        "state": {
            "reasoningStopArmed": true,
            "reasoningStopSummary": "  用户任务目标: 完成 batch08  ",
            "reasoningStopUpdatedAt": 9.8
        }
    }))
    .expect("state view");

    assert_eq!(
        result,
        json!({
            "armed": true,
            "summary": "用户任务目标: 完成 batch08",
            "updated_at": 9
        })
    );
}

#[test]
fn read_reasoning_stop_state_view_returns_default_when_state_is_empty() {
    let result = read_reasoning_stop_state_view(&json!({
        "state": {}
    }))
    .expect("state view");

    assert_eq!(
        result,
        json!({
            "armed": false,
            "summary": ""
        })
    );
}

#[test]
fn clear_reasoning_stop_state_result_keeps_other_fields() {
    let result = build_clear_reasoning_stop_state_result(&json!({
        "state": {
            "reasoningStopArmed": true,
            "reasoningStopSummary": "x",
            "reasoningStopUpdatedAt": 3,
            "reasoningStopFailCount": 2,
            "native": true
        }
    }))
    .expect("clear result");

    assert_eq!(result, json!({ "native": true }));
}

#[test]
fn clear_reasoning_stop_state_result_returns_null_when_no_fields_remain() {
    let result = build_clear_reasoning_stop_state_result(&json!({
        "state": {
            "reasoningStopArmed": true,
            "reasoningStopSummary": "x"
        }
    }))
    .expect("clear result");

    assert_eq!(result, Value::Null);
}

#[test]
fn reasoning_stop_mode_sync_extracts_inline_mode_and_strips_markers() {
    let result = build_reasoning_stop_mode_sync_result(&json!({
        "captured": {
            "messages": [
                {"role":"assistant","content":"done"},
                {"role":"user","content":"请继续 <**stopless:on**> 并保持 <**stopless:endless**>"}
            ],
            "input": [
                {"role":"user","content":[{"type":"text","text":"输入里也有 <**stopless:off**> 标记"}]}
            ]
        },
        "base_state": {
            "reasoningStopMode": "off",
            "native": true
        },
        "fallback_mode": "off"
    }))
    .expect("mode sync");

    assert_eq!(result["mode"], json!("endless"));
    assert_eq!(
        result["captured"]["messages"][1]["content"],
        json!("请继续 并保持")
    );
    assert_eq!(
        result["captured"]["input"][0]["content"][0]["text"],
        json!("输入里也有 标记")
    );
    assert_eq!(
        result["state_patch"],
        json!({
            "reasoningStopMode": "endless",
            "native": true
        })
    );
}

#[test]
fn reasoning_stop_mode_sync_prefers_stored_mode_without_stripping() {
    let result = build_reasoning_stop_mode_sync_result(&json!({
        "captured": {
            "reasoningStopDirectiveMode": "on",
            "messages": [
                {"role":"user","content":"请继续 <**stopless:endless**>"}
            ]
        },
        "base_state": {
            "reasoningStopMode": "off",
            "native": true
        }
    }))
    .expect("mode sync");

    assert_eq!(result["mode"], json!("on"));
    assert_eq!(
        result["captured"]["messages"][0]["content"],
        json!("请继续 <**stopless:endless**>")
    );
    assert_eq!(
        result["state_patch"],
        json!({
            "reasoningStopMode": "on",
            "native": true
        })
    );
}

#[test]
fn reasoning_stop_mode_sync_falls_back_to_base_state_without_patch() {
    let result = build_reasoning_stop_mode_sync_result(&json!({
        "captured": {
            "messages": [
                {"role":"user","content":"请继续处理"}
            ]
        },
        "base_state": {
            "reasoningStopMode": "endless",
            "native": true
        },
        "fallback_mode": "off"
    }))
    .expect("mode sync");

    assert_eq!(result["mode"], json!("endless"));
    assert!(result.get("state_patch").is_none());
}

#[test]
fn reasoning_stop_mode_sync_off_mode_clears_reasoning_fields() {
    let result = build_reasoning_stop_mode_sync_result(&json!({
        "captured": {
            "messages": [
                {"role":"user","content":"请停掉 <**stopless:off**>"}
            ]
        },
        "base_state": {
            "reasoningStopMode": "endless",
            "reasoningStopArmed": true,
            "reasoningStopSummary": "x",
            "reasoningStopUpdatedAt": 9,
            "native": true
        }
    }))
    .expect("mode sync");

    assert_eq!(result["mode"], json!("off"));
    assert_eq!(
        result["state_patch"],
        json!({
            "reasoningStopMode": "off",
            "native": true
        })
    );
}

fn unique_test_dir(name: &str) -> PathBuf {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|value| value.as_nanos())
        .unwrap_or(0);
    let dir = std::env::temp_dir().join(format!("rcc-core-{name}-{}-{nanos}", process::id()));
    fs::create_dir_all(&dir).expect("create temp dir");
    dir
}

fn sticky_filepath(dir: &Path, sticky_key: &str) -> PathBuf {
    let (scope, raw_id) = sticky_key.split_once(':').expect("sticky key");
    let safe_id: String = raw_id
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || ch == '_' || ch == '.' || ch == '-' {
                ch
            } else {
                '_'
            }
        })
        .collect();
    dir.join(format!("{scope}-{safe_id}.json"))
}

#[test]
fn sticky_store_save_then_load_round_trips_state() {
    let dir = unique_test_dir("sticky-roundtrip");
    let sticky_key = "session:demo-1";
    let state = json!({
        "reasoningStopMode": "endless",
        "reasoningStopArmed": true,
        "reasoningStopSummary": "用户任务目标: 完成 batch10"
    });

    let saved = save_reasoning_stop_sticky_state(&json!({
        "sticky_key": sticky_key,
        "session_dir": dir,
        "state": state
    }))
    .expect("save result");
    assert_eq!(saved["sticky_key"], json!(sticky_key));

    let loaded = load_reasoning_stop_sticky_state(&json!({
        "sticky_key": sticky_key,
        "session_dir": dir
    }))
    .expect("load result");
    assert_eq!(loaded["sticky_key"], json!(sticky_key));
    assert_eq!(loaded["state"], state);

    let _ = fs::remove_dir_all(&dir);
}

#[test]
fn sticky_store_delete_returns_null_on_later_load() {
    let dir = unique_test_dir("sticky-delete");
    let sticky_key = "conversation:demo/1";

    save_reasoning_stop_sticky_state(&json!({
        "sticky_key": sticky_key,
        "session_dir": dir,
        "state": {
            "reasoningStopMode": "on"
        }
    }))
    .expect("save result");

    let deleted = save_reasoning_stop_sticky_state(&json!({
        "sticky_key": sticky_key,
        "session_dir": dir,
        "state": null
    }))
    .expect("delete result");
    assert_eq!(deleted["state"], Value::Null);

    let loaded = load_reasoning_stop_sticky_state(&json!({
        "sticky_key": sticky_key,
        "session_dir": dir
    }))
    .expect("load result");
    assert_eq!(loaded["state"], Value::Null);

    let _ = fs::remove_dir_all(&dir);
}

#[test]
fn sticky_store_load_accepts_bare_object_file() {
    let dir = unique_test_dir("sticky-bare");
    let sticky_key = "tmux:demo 1";
    let filepath = sticky_filepath(&dir, sticky_key);
    fs::write(
        &filepath,
        r#"{"reasoningStopMode":"off","reasoningStopSummary":"bare"}"#,
    )
    .expect("write bare file");

    let loaded = load_reasoning_stop_sticky_state(&json!({
        "sticky_key": sticky_key,
        "session_dir": dir
    }))
    .expect("load result");
    assert_eq!(
        loaded["state"],
        json!({
            "reasoningStopMode": "off",
            "reasoningStopSummary": "bare"
        })
    );

    let _ = fs::remove_dir_all(&dir);
}

#[test]
fn sticky_store_rejects_invalid_key() {
    assert!(save_reasoning_stop_sticky_state(&json!({
        "sticky_key": "bad",
        "state": {}
    }))
    .is_none());
    assert!(load_reasoning_stop_sticky_state(&json!({
        "sticky_key": "bad"
    }))
    .is_none());
}

#[test]
fn fail_count_read_returns_zero_when_file_missing() {
    let dir = unique_test_dir("fail-read-missing");
    let result = read_reasoning_stop_fail_count(&json!({
        "sticky_key": "session:missing",
        "session_dir": dir
    }))
    .expect("read result");
    assert_eq!(result, json!({ "count": 0 }));
    let _ = fs::remove_dir_all(&dir);
}

#[test]
fn fail_count_increment_then_read_returns_incremented_value() {
    let dir = unique_test_dir("fail-inc-read");
    let payload = json!({
        "sticky_key": "session:demo-1",
        "session_dir": dir
    });

    let inc1 = increment_reasoning_stop_fail_count(&payload).expect("inc1");
    let inc2 = increment_reasoning_stop_fail_count(&payload).expect("inc2");
    let read = read_reasoning_stop_fail_count(&payload).expect("read");

    assert_eq!(inc1, json!({ "count": 1 }));
    assert_eq!(inc2, json!({ "count": 2 }));
    assert_eq!(read, json!({ "count": 2 }));
    let _ = fs::remove_dir_all(payload["session_dir"].as_str().expect("dir"));
}

#[test]
fn fail_count_reset_returns_zero_and_removes_count_from_state() {
    let dir = unique_test_dir("fail-reset");
    let payload = json!({
        "sticky_key": "session:demo-1",
        "session_dir": dir
    });

    increment_reasoning_stop_fail_count(&payload).expect("inc");
    let reset = reset_reasoning_stop_fail_count(&payload).expect("reset");
    let read = read_reasoning_stop_fail_count(&payload).expect("read");

    assert_eq!(reset, json!({ "count": 0 }));
    assert_eq!(read, json!({ "count": 0 }));
    let _ = fs::remove_dir_all(payload["session_dir"].as_str().expect("dir"));
}
