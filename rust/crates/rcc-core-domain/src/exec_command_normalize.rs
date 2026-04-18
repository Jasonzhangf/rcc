use regex::Regex;
use serde_json::{Map, Value};

type JsonObject = Map<String, Value>;

const COMMAND_KEYS: [&str; 4] = ["cmd", "command", "toon", "script"];

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum ExecCommandSchemaMode {
    Canonical,
    #[default]
    Compat,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct ExecCommandNormalizeOptions {
    pub schema_mode: ExecCommandSchemaMode,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExecCommandNormalizeError {
    MissingCmd,
}

impl ExecCommandNormalizeError {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::MissingCmd => "missing_cmd",
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum ExecCommandNormalizeResult {
    Ok {
        normalized: JsonObject,
    },
    Err {
        reason: ExecCommandNormalizeError,
        normalized: JsonObject,
    },
}

fn has_command_field(value: &Value) -> bool {
    value
        .as_object()
        .is_some_and(|obj| COMMAND_KEYS.iter().any(|key| obj.contains_key(*key)))
}

fn clone_object(value: &Value) -> JsonObject {
    value.as_object().cloned().unwrap_or_default()
}

fn unwrap_exec_args_shape(value: &Value) -> JsonObject {
    let obj = match value.as_object() {
        Some(obj) => obj,
        None => return JsonObject::new(),
    };

    if has_command_field(value) {
        return obj.clone();
    }

    let nested = obj
        .get("input")
        .filter(|nested| has_command_field(nested))
        .or_else(|| {
            obj.get("arguments")
                .filter(|nested| has_command_field(nested))
        });

    if let Some(nested) = nested {
        let mut merged = clone_object(nested);
        merged.extend(obj.clone());
        merged
    } else {
        obj.clone()
    }
}

fn as_non_empty_string(value: Option<&Value>) -> Option<String> {
    let raw = value?.as_str()?;
    let trimmed = raw.trim();
    (!trimmed.is_empty()).then(|| trimmed.to_string())
}

fn as_primitive_string(value: Option<&Value>) -> Option<String> {
    match value? {
        Value::String(raw) => {
            let trimmed = raw.trim();
            (!trimmed.is_empty()).then(|| trimmed.to_string())
        }
        Value::Number(number) => Some(number.to_string()),
        Value::Bool(flag) => Some(flag.to_string()),
        _ => None,
    }
}

fn js_string(value: &Value) -> Option<String> {
    match value {
        Value::Null => None,
        Value::String(raw) => Some(raw.clone()),
        Value::Number(number) => Some(number.to_string()),
        Value::Bool(flag) => Some(flag.to_string()),
        Value::Array(items) => Some(
            items
                .iter()
                .filter_map(js_string)
                .collect::<Vec<_>>()
                .join(","),
        ),
        Value::Object(_) => Some("[object Object]".to_string()),
    }
}

fn as_string_array(value: Option<&Value>) -> Option<Vec<String>> {
    let items = value?.as_array()?;
    let out = items.iter().filter_map(js_string).collect::<Vec<_>>();
    (!out.is_empty()).then_some(out)
}

fn as_finite_number(value: Option<&Value>) -> Option<Value> {
    match value? {
        Value::Number(number) => {
            let finite = number.as_f64().map(|raw| raw.is_finite()).unwrap_or(true);
            finite.then(|| Value::Number(number.clone()))
        }
        _ => None,
    }
}

fn as_boolean(value: Option<&Value>) -> Option<bool> {
    value?.as_bool()
}

fn first_present<'a>(base: &'a JsonObject, keys: &[&str]) -> Option<&'a Value> {
    keys.iter().find_map(|key| base.get(*key))
}

fn escape_unescaped_parens(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    let mut prev_backslash = false;
    for ch in input.chars() {
        if (ch == '(' || ch == ')') && !prev_backslash {
            out.push('\\');
            out.push(ch);
        } else {
            out.push(ch);
        }
        prev_backslash = ch == '\\';
    }
    out
}

fn repair_find_meta(script: &str) -> String {
    if script.is_empty() {
        return script.to_string();
    }

    static HAS_FIND_RE: std::sync::OnceLock<Regex> = std::sync::OnceLock::new();
    static EXEC_RE: std::sync::OnceLock<Regex> = std::sync::OnceLock::new();

    let has_find = HAS_FIND_RE
        .get_or_init(|| Regex::new(r"(^|\s)find\s").expect("valid find regex"))
        .is_match(script);
    if !has_find {
        return script.to_string();
    }

    let repaired_exec = EXEC_RE
        .get_or_init(|| Regex::new(r"-exec([^;]*?)(?:\\*);").expect("valid exec regex"))
        .replace_all(script, "-exec$1 \\\\;")
        .into_owned();

    escape_unescaped_parens(&repaired_exec)
}

pub fn normalize_exec_command_args(
    args: &Value,
    options: ExecCommandNormalizeOptions,
) -> ExecCommandNormalizeResult {
    let canonical_only = options.schema_mode == ExecCommandSchemaMode::Canonical;
    let mut base = if canonical_only {
        clone_object(args)
    } else {
        unwrap_exec_args_shape(args)
    };

    let cmd_candidate = if canonical_only {
        as_non_empty_string(base.get("cmd"))
    } else {
        as_primitive_string(base.get("cmd"))
            .or_else(|| as_primitive_string(base.get("command")))
            .or_else(|| as_primitive_string(base.get("toon")))
            .or_else(|| as_primitive_string(base.get("script")))
            .or_else(|| {
                as_string_array(base.get("command"))
                    .or_else(|| as_string_array(base.get("cmd")))
                    .map(|parts| parts.join(" "))
            })
    };

    base.remove("toon");

    let cmd_candidate = match cmd_candidate {
        Some(cmd) => cmd,
        None => {
            return ExecCommandNormalizeResult::Err {
                reason: ExecCommandNormalizeError::MissingCmd,
                normalized: base,
            }
        }
    };

    let mut normalized = JsonObject::new();
    normalized.insert(
        "cmd".to_string(),
        Value::String(repair_find_meta(&cmd_candidate)),
    );

    let workdir = if canonical_only {
        as_non_empty_string(base.get("workdir"))
    } else {
        as_non_empty_string(first_present(&base, &["workdir", "cwd", "workDir"]))
    };
    if let Some(workdir) = workdir {
        normalized.insert("workdir".to_string(), Value::String(workdir));
    }

    if let Some(login) = as_boolean(base.get("login")) {
        normalized.insert("login".to_string(), Value::Bool(login));
    }

    if let Some(tty) = as_boolean(base.get("tty")) {
        normalized.insert("tty".to_string(), Value::Bool(tty));
    }

    let timeout_ms = if canonical_only {
        as_finite_number(base.get("timeout_ms"))
    } else {
        as_finite_number(first_present(&base, &["timeout_ms", "timeoutMs"]))
    };
    if let Some(timeout_ms) = timeout_ms {
        normalized.insert("timeout_ms".to_string(), timeout_ms);
    }

    if let Some(shell) = as_non_empty_string(base.get("shell")) {
        normalized.insert("shell".to_string(), Value::String(shell));
    }

    let sandbox_permissions = if canonical_only {
        as_non_empty_string(base.get("sandbox_permissions"))
    } else {
        as_non_empty_string(base.get("sandbox_permissions")).or_else(|| {
            as_boolean(base.get("with_escalated_permissions"))
                .filter(|flag| *flag)
                .map(|_| "require_escalated".to_string())
        })
    };
    if let Some(sandbox_permissions) = sandbox_permissions {
        normalized.insert(
            "sandbox_permissions".to_string(),
            Value::String(sandbox_permissions),
        );
    }

    if let Some(justification) = as_non_empty_string(base.get("justification")) {
        normalized.insert("justification".to_string(), Value::String(justification));
    }

    let max_output_tokens = if canonical_only {
        as_finite_number(base.get("max_output_tokens"))
    } else {
        as_finite_number(first_present(&base, &["max_output_tokens", "max_tokens"]))
    };
    if let Some(max_output_tokens) = max_output_tokens {
        normalized.insert("max_output_tokens".to_string(), max_output_tokens);
    }

    let yield_time_ms = if canonical_only {
        as_finite_number(base.get("yield_time_ms"))
    } else {
        as_finite_number(first_present(
            &base,
            &["yield_time_ms", "yield_ms", "wait_ms"],
        ))
    };
    if let Some(yield_time_ms) = yield_time_ms {
        normalized.insert("yield_time_ms".to_string(), yield_time_ms);
    }

    ExecCommandNormalizeResult::Ok { normalized }
}

#[cfg(test)]
mod tests {
    use super::{
        normalize_exec_command_args, ExecCommandNormalizeError, ExecCommandNormalizeOptions,
        ExecCommandNormalizeResult, ExecCommandSchemaMode,
    };
    use serde_json::{json, Value};

    #[test]
    fn compat_mode_unwraps_nested_input_and_normalizes_aliases() {
        let args = json!({
            "input": {
                "command": "find . -type f ( -name '*.rs' ) -exec echo {} ;",
                "cwd": "/nested"
            },
            "workdir": "/repo",
            "timeoutMs": 1200,
            "with_escalated_permissions": true,
            "max_tokens": 256,
            "yield_ms": 40,
            "tty": true,
            "login": false,
            "shell": "bash",
            "justification": "batch02"
        });

        let result = normalize_exec_command_args(&args, ExecCommandNormalizeOptions::default());
        match result {
            ExecCommandNormalizeResult::Ok { normalized } => {
                assert_eq!(
                    Value::Object(normalized),
                    json!({
                        "cmd": "find . -type f \\( -name '*.rs' \\) -exec echo {}  \\\\;",
                        "workdir": "/repo",
                        "timeout_ms": 1200,
                        "sandbox_permissions": "require_escalated",
                        "max_output_tokens": 256,
                        "yield_time_ms": 40,
                        "tty": true,
                        "login": false,
                        "shell": "bash",
                        "justification": "batch02"
                    })
                );
            }
            other => panic!("expected ok result, got {other:?}"),
        }
    }

    #[test]
    fn canonical_mode_only_accepts_canonical_fields() {
        let args = json!({
            "cmd": "echo ok",
            "command": "echo compat-only",
            "timeout_ms": 900,
            "timeoutMs": 1800,
            "input": { "cmd": "nested" }
        });

        let result = normalize_exec_command_args(
            &args,
            ExecCommandNormalizeOptions {
                schema_mode: ExecCommandSchemaMode::Canonical,
            },
        );
        match result {
            ExecCommandNormalizeResult::Ok { normalized } => {
                assert_eq!(
                    Value::Object(normalized),
                    json!({
                        "cmd": "echo ok",
                        "timeout_ms": 900
                    })
                );
            }
            other => panic!("expected ok result, got {other:?}"),
        }
    }

    #[test]
    fn compat_mode_supports_command_array_join() {
        let args = json!({
            "command": ["echo", 123, true]
        });

        let result = normalize_exec_command_args(&args, ExecCommandNormalizeOptions::default());
        match result {
            ExecCommandNormalizeResult::Ok { normalized } => {
                assert_eq!(
                    normalized.get("cmd"),
                    Some(&Value::String("echo 123 true".to_string()))
                );
            }
            other => panic!("expected ok result, got {other:?}"),
        }
    }

    #[test]
    fn compat_mode_uses_script_alias_when_cmd_missing() {
        let args = json!({
            "script": "printf hello"
        });

        let result = normalize_exec_command_args(&args, ExecCommandNormalizeOptions::default());
        match result {
            ExecCommandNormalizeResult::Ok { normalized } => {
                assert_eq!(
                    normalized.get("cmd"),
                    Some(&Value::String("printf hello".to_string()))
                );
            }
            other => panic!("expected ok result, got {other:?}"),
        }
    }

    #[test]
    fn missing_cmd_returns_reason_and_drops_toon() {
        let args = json!({
            "toon": "   ",
            "cwd": "/tmp",
            "input": { "foo": "bar" }
        });

        let result = normalize_exec_command_args(&args, ExecCommandNormalizeOptions::default());
        match result {
            ExecCommandNormalizeResult::Err { reason, normalized } => {
                assert_eq!(reason, ExecCommandNormalizeError::MissingCmd);
                assert_eq!(reason.as_str(), "missing_cmd");
                assert_eq!(
                    Value::Object(normalized),
                    json!({
                        "cwd": "/tmp",
                        "input": { "foo": "bar" }
                    })
                );
            }
            other => panic!("expected error result, got {other:?}"),
        }
    }

    #[test]
    fn canonical_mode_does_not_use_aliases_or_nested_wrappers() {
        let args = json!({
            "command": "echo ignored",
            "timeoutMs": 5,
            "input": { "cmd": "nested" }
        });

        let result = normalize_exec_command_args(
            &args,
            ExecCommandNormalizeOptions {
                schema_mode: ExecCommandSchemaMode::Canonical,
            },
        );
        match result {
            ExecCommandNormalizeResult::Err { reason, normalized } => {
                assert_eq!(reason, ExecCommandNormalizeError::MissingCmd);
                assert_eq!(
                    Value::Object(normalized),
                    json!({
                        "command": "echo ignored",
                        "timeoutMs": 5,
                        "input": { "cmd": "nested" }
                    })
                );
            }
            other => panic!("expected error result, got {other:?}"),
        }
    }
}
