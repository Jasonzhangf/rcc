use serde_json::Value;

const APPLY_PATCH_NAME: &str = "apply_patch";
const SHELL_TOOL_ALIASES: [&str; 4] = ["shell", "shell_command", "exec_command", "bash"];

pub fn normalize_tool_name(value: &str) -> String {
    value.trim().to_lowercase()
}

fn extract_tool_function_name(entry: &Value) -> String {
    match entry {
        Value::Object(obj) => {
            if let Some(Value::Object(function)) = obj.get("function") {
                if let Some(Value::String(name)) = function.get("name") {
                    let trimmed = name.trim();
                    if !trimmed.is_empty() {
                        return trimmed.to_string();
                    }
                }
            }
            if let Some(Value::String(name)) = obj.get("name") {
                return name.trim().to_string();
            }
            String::new()
        }
        _ => String::new(),
    }
}

pub fn is_shell_tool_name(value: &str) -> bool {
    let normalized = normalize_tool_name(value);
    SHELL_TOOL_ALIASES.contains(&normalized.as_str())
}

pub fn has_apply_patch_tool_declared(tools: &[Value]) -> bool {
    tools
        .iter()
        .any(|entry| normalize_tool_name(&extract_tool_function_name(entry)) == APPLY_PATCH_NAME)
}

pub fn build_shell_description(tool_display_name: &str, has_apply_patch: bool) -> String {
    let label = if tool_display_name.trim().is_empty() {
        "shell"
    } else {
        tool_display_name.trim()
    };

    let base = "Runs a shell command and returns its output.";
    let workdir_line = format!(
        "- Always set the `workdir` param when using the {} function. Avoid using `cd` unless absolutely necessary.",
        label
    );
    let apply_patch_line =
        "- Prefer apply_patch for editing files instead of shell redirection or here-doc usage.";

    if has_apply_patch {
        format!("{base}\n{workdir_line}\n{apply_patch_line}")
    } else {
        format!("{base}\n{workdir_line}")
    }
}

pub fn append_apply_patch_reminder(description: &str, has_apply_patch: bool) -> String {
    if !has_apply_patch {
        return description.to_string();
    }

    let trimmed = description.trim();
    if trimmed.is_empty() {
        return build_shell_description("shell", true);
    }
    if trimmed.contains("apply_patch") {
        return trimmed.to_string();
    }

    let apply_patch_line =
        "- Prefer apply_patch for editing files instead of shell redirection or here-doc usage.";
    format!("{trimmed}\n{apply_patch_line}")
}

#[cfg(test)]
mod tests {
    use super::{
        append_apply_patch_reminder, build_shell_description, has_apply_patch_tool_declared,
        is_shell_tool_name, normalize_tool_name,
    };
    use serde_json::json;

    #[test]
    fn normalize_tool_name_trims_and_lowercases() {
        assert_eq!(normalize_tool_name("  Exec_Command "), "exec_command");
    }

    #[test]
    fn shell_aliases_share_same_family() {
        for name in ["shell", "shell_command", "exec_command", "bash"] {
            assert!(is_shell_tool_name(name), "expected shell alias: {name}");
        }
        assert!(!is_shell_tool_name("apply_patch"));
    }

    #[test]
    fn apply_patch_detection_reads_function_or_top_level_name() {
        let tools = vec![
            json!({"type": "function", "function": {"name": "exec_command"}}),
            json!({"name": "apply_patch"}),
        ];
        assert!(has_apply_patch_tool_declared(&tools));
    }

    #[test]
    fn apply_patch_detection_ignores_missing_or_blank_names() {
        let tools = vec![
            json!({"type": "function", "function": {"name": "  "}}),
            json!({"type": "function", "function": {"name": "shell"}}),
        ];
        assert!(!has_apply_patch_tool_declared(&tools));
    }

    #[test]
    fn build_shell_description_includes_workdir_and_optional_apply_patch_line() {
        let without_apply = build_shell_description("exec_command", false);
        assert!(without_apply.contains("Runs a shell command and returns its output."));
        assert!(without_apply.contains("`workdir`"));
        assert!(!without_apply.contains("apply_patch"));

        let with_apply = build_shell_description("bash", true);
        assert!(with_apply.contains("bash function"));
        assert!(with_apply.contains("apply_patch"));
    }

    #[test]
    fn append_apply_patch_reminder_is_idempotent_and_has_empty_fallback() {
        let appended = append_apply_patch_reminder("Use shell carefully.", true);
        assert!(appended.contains("apply_patch"));

        let unchanged = append_apply_patch_reminder(&appended, true);
        assert_eq!(unchanged, appended);

        let fallback = append_apply_patch_reminder("   ", true);
        assert!(fallback.contains("Runs a shell command and returns its output."));
    }

    #[test]
    fn append_apply_patch_reminder_returns_original_when_disabled() {
        let description = "Use shell carefully.";
        assert_eq!(
            append_apply_patch_reminder(description, false),
            description.to_string()
        );
    }
}
