use serde_json::Value;
use std::collections::BTreeSet;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FollowupTrimOptions {
    pub max_non_system_messages: usize,
}

fn is_message_record(value: &Value) -> bool {
    value.is_object()
}

fn normalize_role(role: &Value) -> String {
    role.as_str()
        .map(|value| value.trim().to_lowercase())
        .unwrap_or_default()
}

fn is_system_role(role: &str) -> bool {
    let normalized = role.trim().to_lowercase();
    normalized == "system" || normalized == "developer"
}

fn is_user_message(msg: &Value) -> bool {
    msg.as_object()
        .and_then(|obj| obj.get("role"))
        .map(normalize_role)
        .is_some_and(|role| role == "user")
}

fn is_tool_response_message(msg: &Value) -> bool {
    let role = msg
        .as_object()
        .and_then(|obj| obj.get("role"))
        .map(normalize_role)
        .unwrap_or_default();
    role == "tool" || role == "function"
}

fn is_assistant_tool_call_message(msg: &Value) -> bool {
    let Some(obj) = msg.as_object() else {
        return false;
    };
    let role = obj.get("role").map(normalize_role).unwrap_or_default();
    if role != "assistant" && role != "model" {
        return false;
    }
    if obj
        .get("tool_calls")
        .and_then(Value::as_array)
        .is_some_and(|calls| !calls.is_empty())
    {
        return true;
    }
    obj.get("function_call").is_some_and(Value::is_object)
}

fn find_prev_index(
    messages: &[Value],
    start_index_exclusive: usize,
    predicate: impl Fn(&Value) -> bool,
) -> Option<usize> {
    for i in (0..start_index_exclusive).rev() {
        let msg = &messages[i];
        if predicate(msg) {
            return Some(i);
        }
    }
    None
}

pub fn trim_openai_messages_for_followup(
    raw_messages: &Value,
    options: FollowupTrimOptions,
) -> Vec<Value> {
    let max_non_system_messages = options.max_non_system_messages.max(1);

    let messages = raw_messages.as_array().cloned().unwrap_or_default();
    if messages.is_empty() {
        return Vec::new();
    }

    let message_records: Vec<Value> = messages.into_iter().filter(is_message_record).collect();
    if message_records.is_empty() {
        return Vec::new();
    }

    let mut non_system_indices = Vec::new();
    for (i, entry) in message_records.iter().enumerate() {
        let role = entry
            .as_object()
            .and_then(|obj| obj.get("role"))
            .map(normalize_role)
            .unwrap_or_default();
        if role.is_empty() || is_system_role(&role) {
            continue;
        }
        non_system_indices.push(i);
    }

    if non_system_indices.len() <= max_non_system_messages {
        return message_records;
    }

    let mut keep_set: BTreeSet<usize> = non_system_indices
        .iter()
        .skip(non_system_indices.len() - max_non_system_messages)
        .copied()
        .collect();

    let mut changed = true;
    let mut guard = 0;
    while changed && guard < 8 {
        changed = false;
        guard += 1;
        let sorted: Vec<usize> = keep_set.iter().copied().collect();
        for idx in sorted {
            let msg = &message_records[idx];

            if is_tool_response_message(msg) {
                let tool_call_index =
                    find_prev_index(&message_records, idx, is_assistant_tool_call_message);
                if let Some(tool_call_index) = tool_call_index {
                    if keep_set.insert(tool_call_index) {
                        changed = true;
                    }
                    let anchor_index = find_prev_index(&message_records, tool_call_index, |m| {
                        is_user_message(m) || is_tool_response_message(m)
                    });
                    if let Some(anchor_index) = anchor_index {
                        if keep_set.insert(anchor_index) {
                            changed = true;
                        }
                    }
                }
                continue;
            }

            if is_assistant_tool_call_message(msg) {
                let anchor_index = find_prev_index(&message_records, idx, |m| {
                    is_user_message(m) || is_tool_response_message(m)
                });
                if let Some(anchor_index) = anchor_index {
                    if keep_set.insert(anchor_index) {
                        changed = true;
                    }
                }
                for i in idx + 1..message_records.len() {
                    let next = &message_records[i];
                    if !is_tool_response_message(next) {
                        break;
                    }
                    if keep_set.insert(i) {
                        changed = true;
                    }
                }
            }
        }
    }

    let first_kept_non_system = (0..message_records.len()).find(|&i| {
        let role = message_records[i]
            .as_object()
            .and_then(|obj| obj.get("role"))
            .map(normalize_role)
            .unwrap_or_default();
        !role.is_empty() && !is_system_role(&role) && keep_set.contains(&i)
    });

    if let Some(first_kept_non_system) = first_kept_non_system {
        if !is_user_message(&message_records[first_kept_non_system]) {
            let user_anchor =
                find_prev_index(&message_records, first_kept_non_system, is_user_message);
            if let Some(user_anchor) = user_anchor {
                keep_set.insert(user_anchor);
                let sorted: Vec<usize> = keep_set.iter().copied().collect();
                for idx in sorted {
                    let msg = &message_records[idx];
                    if is_tool_response_message(msg) {
                        if let Some(tool_call_index) =
                            find_prev_index(&message_records, idx, is_assistant_tool_call_message)
                        {
                            keep_set.insert(tool_call_index);
                        }
                    } else if is_assistant_tool_call_message(msg) {
                        if let Some(anchor_index) = find_prev_index(&message_records, idx, |m| {
                            is_user_message(m) || is_tool_response_message(m)
                        }) {
                            keep_set.insert(anchor_index);
                        }
                    }
                }
            } else {
                let first_user_after = (first_kept_non_system..message_records.len())
                    .find(|&i| keep_set.contains(&i) && is_user_message(&message_records[i]));
                if let Some(first_user_after) = first_user_after {
                    let to_remove: Vec<usize> = keep_set
                        .iter()
                        .copied()
                        .filter(|idx| *idx < first_user_after)
                        .collect();
                    for idx in to_remove {
                        keep_set.remove(&idx);
                    }
                }
            }
        }
    }

    let mut trimmed = Vec::new();
    for (i, entry) in message_records.iter().enumerate() {
        let role = entry
            .as_object()
            .and_then(|obj| obj.get("role"))
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_string();
        if !role.is_empty() && is_system_role(&role) {
            trimmed.push(entry.clone());
            continue;
        }
        if keep_set.contains(&i) {
            trimmed.push(entry.clone());
        }
    }
    trimmed
}

#[cfg(test)]
mod tests {
    use super::{trim_openai_messages_for_followup, FollowupTrimOptions};
    use serde_json::json;

    fn roles(messages: &[serde_json::Value]) -> Vec<String> {
        messages
            .iter()
            .map(|msg| {
                msg.get("role")
                    .and_then(serde_json::Value::as_str)
                    .unwrap_or_default()
                    .to_string()
            })
            .collect()
    }

    #[test]
    fn keeps_all_messages_when_non_system_count_within_limit() {
        let raw = json!([
            {"role":"system","content":"s"},
            {"role":"user","content":"u1"},
            {"role":"assistant","content":"a1"}
        ]);
        let trimmed = trim_openai_messages_for_followup(
            &raw,
            FollowupTrimOptions {
                max_non_system_messages: 4,
            },
        );
        assert_eq!(trimmed, raw.as_array().cloned().unwrap());
    }

    #[test]
    fn always_keeps_system_and_developer_messages() {
        let raw = json!([
            {"role":"system","content":"s"},
            {"role":"developer","content":"d"},
            {"role":"user","content":"u1"},
            {"role":"assistant","content":"a1"},
            {"role":"user","content":"u2"}
        ]);
        let trimmed = trim_openai_messages_for_followup(
            &raw,
            FollowupTrimOptions {
                max_non_system_messages: 1,
            },
        );
        assert_eq!(roles(&trimmed), vec!["system", "developer", "user"]);
    }

    #[test]
    fn preserves_tool_call_and_tool_response_adjacency() {
        let raw = json!([
            {"role":"system","content":"s"},
            {"role":"user","content":"old"},
            {"role":"assistant","tool_calls":[{"id":"1"}]},
            {"role":"tool","content":"tool1"},
            {"role":"assistant","content":"after tool"},
            {"role":"user","content":"latest"}
        ]);
        let trimmed = trim_openai_messages_for_followup(
            &raw,
            FollowupTrimOptions {
                max_non_system_messages: 2,
            },
        );
        assert_eq!(roles(&trimmed), vec!["system", "user", "assistant", "user"]);
    }

    #[test]
    fn preserves_adjacency_when_kept_window_contains_tool_response() {
        let raw = json!([
            {"role":"system","content":"s"},
            {"role":"user","content":"anchor"},
            {"role":"assistant","tool_calls":[{"id":"1"}]},
            {"role":"tool","content":"tool1"}
        ]);
        let trimmed = trim_openai_messages_for_followup(
            &raw,
            FollowupTrimOptions {
                max_non_system_messages: 1,
            },
        );
        assert_eq!(roles(&trimmed), vec!["system", "user", "assistant", "tool"]);
    }

    #[test]
    fn drops_invalid_prefix_when_no_prior_user_anchor_exists() {
        let raw = json!([
            {"role":"system","content":"s"},
            {"role":"assistant","tool_calls":[{"id":"1"}]},
            {"role":"tool","content":"tool1"},
            {"role":"user","content":"later user"},
            {"role":"assistant","content":"later assistant"}
        ]);
        let trimmed = trim_openai_messages_for_followup(
            &raw,
            FollowupTrimOptions {
                max_non_system_messages: 2,
            },
        );
        assert_eq!(roles(&trimmed), vec!["system", "user", "assistant"]);
    }

    #[test]
    fn filters_non_object_entries() {
        let raw = json!([
            "bad",
            {"role":"user","content":"u"},
            1,
            {"role":"assistant","content":"a"}
        ]);
        let trimmed = trim_openai_messages_for_followup(
            &raw,
            FollowupTrimOptions {
                max_non_system_messages: 4,
            },
        );
        assert_eq!(roles(&trimmed), vec!["user", "assistant"]);
    }
}
