use regex::Regex;
use serde_json::Value;
use std::collections::{HashMap, HashSet};
use std::sync::LazyLock;

static WEB_TOOL_KEYWORDS: &[&str] = &[
    "websearch",
    "web_search",
    "web-search",
    "webfetch",
    "web_fetch",
    "web_request",
    "search_web",
    "internet_search",
];
static READ_TOOL_EXACT: &[&str] = &[
    "read",
    "read_file",
    "read_text",
    "view_file",
    "view_code",
    "view_document",
    "open_file",
    "get_file",
    "download_file",
    "describe_current_request",
];
static WRITE_TOOL_EXACT: &[&str] = &[
    "edit",
    "write",
    "multiedit",
    "apply_patch",
    "write_file",
    "create_file",
    "modify_file",
    "edit_file",
    "update_file",
    "save_file",
    "append_file",
    "replace_file",
];
static SEARCH_TOOL_EXACT: &[&str] = &[
    "search_files",
    "find_files",
    "search_documents",
    "search_repo",
    "glob_search",
    "grep_files",
    "code_search",
    "lookup_symbol",
    "list_files",
    "list_directory",
    "list_dir",
];
static WRITE_TOOL_KEYWORDS: &[&str] = &[
    "write", "patch", "modify", "edit", "create", "update", "append", "replace", "save",
];
static SEARCH_TOOL_KEYWORDS: &[&str] = &["find", "grep", "glob", "lookup", "locate"];

static SHELL_TOOL_NAMES: LazyLock<HashSet<&'static str>> =
    LazyLock::new(|| HashSet::from(["shell_command", "shell", "bash"]));
static SHELL_WRITE_COMMANDS: LazyLock<HashSet<&'static str>> =
    LazyLock::new(|| HashSet::from(["apply_patch", "tee", "touch", "truncate", "patch"]));
static SHELL_READ_COMMANDS: LazyLock<HashSet<&'static str>> = LazyLock::new(|| {
    HashSet::from([
        "cat", "head", "tail", "awk", "strings", "less", "more", "nl",
    ])
});
static SHELL_SEARCH_COMMANDS: LazyLock<HashSet<&'static str>> = LazyLock::new(|| {
    HashSet::from([
        "rg",
        "ripgrep",
        "grep",
        "egrep",
        "fgrep",
        "ag",
        "ack",
        "find",
        "fd",
        "locate",
        "codesearch",
    ])
});
static SHELL_REDIRECT_WRITE_BINARIES: LazyLock<HashSet<&'static str>> = LazyLock::new(|| {
    HashSet::from([
        "cat", "printf", "python", "node", "perl", "ruby", "php", "bash", "sh", "zsh", "echo",
    ])
});
static SHELL_WRAPPER_COMMANDS: LazyLock<HashSet<&'static str>> =
    LazyLock::new(|| HashSet::from(["sudo", "env", "time", "nice", "nohup", "command", "stdbuf"]));
static COMMAND_ALIASES: LazyLock<HashMap<&'static str, &'static str>> = LazyLock::new(|| {
    HashMap::from([
        ("python3", "python"),
        ("pip3", "pip"),
        ("ripgrep", "rg"),
        ("perl5", "perl"),
    ])
});
static GIT_WRITE_SUBCOMMANDS: LazyLock<HashSet<&'static str>> = LazyLock::new(|| {
    HashSet::from([
        "add", "commit", "apply", "am", "rebase", "checkout", "merge",
    ])
});
static GIT_SEARCH_SUBCOMMANDS: LazyLock<HashSet<&'static str>> =
    LazyLock::new(|| HashSet::from(["grep", "log", "shortlog", "reflog", "blame"]));
static BD_SEARCH_SUBCOMMANDS: LazyLock<HashSet<&'static str>> =
    LazyLock::new(|| HashSet::from(["search"]));
static PACKAGE_MANAGER_COMMANDS: LazyLock<HashMap<&'static str, HashSet<&'static str>>> =
    LazyLock::new(|| {
        HashMap::from([
            ("npm", HashSet::from(["install"])),
            ("pnpm", HashSet::from(["install"])),
            ("yarn", HashSet::from(["add", "install"])),
            ("pip", HashSet::from(["install"])),
            ("pip3", HashSet::from(["install"])),
            ("brew", HashSet::from(["install"])),
            ("cargo", HashSet::from(["add", "install"])),
            ("go", HashSet::from(["install"])),
            ("make", HashSet::from(["install"])),
        ])
    });

static SHELL_HEREDOC_PATTERN: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"(?i)<<\s*['"]?[a-z0-9_-]+"#).expect("valid heredoc regex"));
static ENV_ASSIGNMENT_PATTERN: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"^[A-Za-z_][A-Za-z0-9_]*=.*"#).expect("valid env assignment regex")
});
static COMMAND_SEGMENT_SPLIT_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"(?:\r?\n|&&|\|\||;)"#).expect("valid segment split regex"));

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ToolCategory {
    Read,
    Write,
    Search,
    Websearch,
    Other,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ToolClassification {
    pub category: ToolCategory,
    pub name: String,
    pub command_snippet: Option<String>,
}

pub fn detect_vision_tool(request: &Value) -> bool {
    request_tools(request).iter().any(|tool| {
        let function_name = extract_tool_name(tool);
        let description = extract_tool_description(tool);
        contains_vision_keyword(&function_name)
            || description.as_deref().is_some_and(contains_vision_keyword)
    })
}

pub fn detect_coding_tool(request: &Value) -> bool {
    request_tools(request).iter().any(|tool| {
        let function_name = extract_tool_name(tool).to_lowercase();
        let description = extract_tool_description(tool)
            .unwrap_or_default()
            .to_lowercase();
        if function_name.is_empty() && description.is_empty() {
            return false;
        }
        if WRITE_TOOL_EXACT.contains(&function_name.as_str()) {
            return true;
        }
        WRITE_TOOL_KEYWORDS
            .iter()
            .any(|keyword| function_name.contains(keyword) || description.contains(keyword))
    })
}

pub fn detect_web_tool(request: &Value) -> bool {
    request_tools(request).iter().any(|tool| {
        let function_name = extract_tool_name(tool).to_lowercase();
        let description = extract_tool_description(tool)
            .unwrap_or_default()
            .to_lowercase();
        WEB_TOOL_KEYWORDS
            .iter()
            .any(|keyword| function_name.contains(keyword) || description.contains(keyword))
    })
}

pub fn detect_web_search_tool_declared(request: &Value) -> bool {
    request_tools(request).iter().any(|tool| {
        let normalized_name = extract_tool_name(tool)
            .to_lowercase()
            .replace(['-', '_'], "");
        normalized_name == "websearch"
    })
}

pub fn extract_meaningful_declared_tool_names(tools: Option<&Value>) -> Vec<String> {
    let Some(items) = tools.and_then(Value::as_array) else {
        return Vec::new();
    };
    let mut names = Vec::new();
    for tool in items {
        let raw_name = extract_tool_name(tool);
        if raw_name.is_empty() {
            continue;
        }
        let canonical = canonicalize_tool_name(&raw_name).to_lowercase();
        if canonical.is_empty() {
            continue;
        }
        names.push(raw_name);
    }
    names
}

pub fn choose_higher_priority_tool_category(
    current: Option<&ToolClassification>,
    candidate: Option<&ToolClassification>,
) -> Option<ToolClassification> {
    match (current, candidate) {
        (None, Some(candidate)) => Some(candidate.clone()),
        (Some(current), Some(candidate)) => {
            let current_score = tool_category_priority(current.category);
            let candidate_score = tool_category_priority(candidate.category);
            if candidate_score > current_score {
                Some(candidate.clone())
            } else {
                Some(current.clone())
            }
        }
        (Some(current), None) => Some(current.clone()),
        (None, None) => None,
    }
}

pub fn detect_last_assistant_tool_category(messages: &[Value]) -> Option<ToolClassification> {
    for idx in (0..messages.len()).rev() {
        let Some(tool_calls) = messages[idx].get("tool_calls").and_then(Value::as_array) else {
            continue;
        };
        if tool_calls.is_empty() {
            continue;
        }

        let mut best: Option<ToolClassification> = None;
        for call in tool_calls {
            let candidate = classify_tool_call_for_report(call);
            best = choose_higher_priority_tool_category(best.as_ref(), candidate.as_ref());
        }
        if best.is_some() {
            return best;
        }
    }
    None
}

pub fn classify_tool_call_for_report(call: &Value) -> Option<ToolClassification> {
    classify_tool_call(call)
}

pub fn canonicalize_tool_name(raw_name: &str) -> String {
    let trimmed = raw_name.trim();
    if let Some(marker_index) = trimmed.find("arg_") {
        if marker_index > 0 {
            return trimmed[..marker_index].to_string();
        }
    }
    trimmed.to_string()
}

fn classify_tool_call(call: &Value) -> Option<ToolClassification> {
    let function_name = call
        .get("function")
        .and_then(Value::as_object)
        .and_then(|function| function.get("name"))
        .and_then(Value::as_str)
        .map(canonicalize_tool_name)
        .filter(|name| !name.is_empty())?;

    let args_object = parse_tool_arguments(
        call.get("function")
            .and_then(Value::as_object)
            .and_then(|function| function.get("arguments")),
    );
    let command_text = extract_command_text(args_object.as_ref());
    let snippet = build_command_snippet(&command_text);
    let normalized_name = function_name.to_lowercase();

    let is_web_search = WEB_TOOL_KEYWORDS
        .iter()
        .any(|keyword| normalized_name.contains(keyword));
    let name_category = categorize_tool_name(&function_name);
    let mut shell_category = ToolCategory::Other;
    if SHELL_TOOL_NAMES.contains(function_name.as_str()) || function_name == "exec_command" {
        shell_category = classify_shell_command(&command_text);
    }

    if is_web_search {
        return Some(ToolClassification {
            category: ToolCategory::Websearch,
            name: function_name,
            command_snippet: snippet,
        });
    }
    if name_category == ToolCategory::Write || shell_category == ToolCategory::Write {
        return Some(ToolClassification {
            category: ToolCategory::Write,
            name: function_name,
            command_snippet: snippet,
        });
    }
    if name_category == ToolCategory::Read || shell_category == ToolCategory::Read {
        return Some(ToolClassification {
            category: ToolCategory::Read,
            name: function_name,
            command_snippet: snippet,
        });
    }
    if name_category == ToolCategory::Search || shell_category == ToolCategory::Search {
        return Some(ToolClassification {
            category: ToolCategory::Search,
            name: function_name,
            command_snippet: snippet,
        });
    }
    if !SHELL_TOOL_NAMES.contains(function_name.as_str())
        && function_name != "exec_command"
        && !command_text.is_empty()
    {
        let derived = classify_shell_command(&command_text);
        if matches!(
            derived,
            ToolCategory::Write | ToolCategory::Read | ToolCategory::Search
        ) {
            return Some(ToolClassification {
                category: derived,
                name: function_name,
                command_snippet: snippet,
            });
        }
    }

    Some(ToolClassification {
        category: ToolCategory::Other,
        name: function_name,
        command_snippet: snippet,
    })
}

fn request_tools(request: &Value) -> Vec<&Value> {
    request
        .get("tools")
        .and_then(Value::as_array)
        .map(|tools| tools.iter().collect())
        .unwrap_or_default()
}

fn extract_tool_name(tool: &Value) -> String {
    if let Some(name) = tool
        .get("function")
        .and_then(Value::as_object)
        .and_then(|function| function.get("name"))
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|name| !name.is_empty())
    {
        return name.to_string();
    }
    tool.get("name")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|name| !name.is_empty())
        .unwrap_or_default()
        .to_string()
}

fn extract_tool_description(tool: &Value) -> Option<String> {
    tool.get("function")
        .and_then(Value::as_object)
        .and_then(|function| function.get("description"))
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|description| !description.is_empty())
        .map(str::to_string)
        .or_else(|| {
            tool.get("description")
                .and_then(Value::as_str)
                .map(str::trim)
                .filter(|description| !description.is_empty())
                .map(str::to_string)
        })
}

fn parse_tool_arguments(raw_arguments: Option<&Value>) -> Option<Value> {
    let raw_arguments = raw_arguments?;
    match raw_arguments {
        Value::String(text) => serde_json::from_str::<Value>(text)
            .ok()
            .or_else(|| Some(Value::String(text.clone()))),
        Value::Object(_) | Value::Array(_) => Some(raw_arguments.clone()),
        _ => None,
    }
}

fn extract_command_text(args: Option<&Value>) -> String {
    let Some(args) = args else {
        return String::new();
    };
    match args {
        Value::String(text) => text.clone(),
        Value::Array(items) => items
            .iter()
            .filter_map(Value::as_str)
            .collect::<Vec<_>>()
            .join(" "),
        Value::Object(record) => {
            for key in [
                "command", "cmd", "input", "code", "script", "text", "prompt",
            ] {
                if let Some(Value::String(value)) = record.get(key) {
                    if !value.trim().is_empty() {
                        return value.clone();
                    }
                }
                if let Some(Value::Array(value)) = record.get(key) {
                    let joined = value
                        .iter()
                        .filter_map(Value::as_str)
                        .collect::<Vec<_>>()
                        .join(" ");
                    if !joined.trim().is_empty() {
                        return joined;
                    }
                }
            }
            if let Some(Value::String(value)) = record.get("args") {
                if !value.trim().is_empty() {
                    return value.clone();
                }
            }
            if let Some(Value::Array(value)) = record.get("args") {
                let joined = value
                    .iter()
                    .filter_map(Value::as_str)
                    .collect::<Vec<_>>()
                    .join(" ");
                if !joined.trim().is_empty() {
                    return joined;
                }
            }
            String::new()
        }
        _ => String::new(),
    }
}

fn build_command_snippet(command_text: &str) -> Option<String> {
    if command_text.is_empty() {
        return None;
    }
    let collapsed = command_text
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ");
    if collapsed.is_empty() {
        return None;
    }
    let limit = 80usize;
    if collapsed.chars().count() <= limit {
        return Some(collapsed);
    }
    Some(collapsed.chars().take(limit).collect::<String>() + "…")
}

fn categorize_tool_name(name: &str) -> ToolCategory {
    let normalized = name.to_lowercase();
    if SEARCH_TOOL_EXACT.contains(&normalized.as_str())
        || SEARCH_TOOL_KEYWORDS
            .iter()
            .any(|keyword| normalized.contains(keyword))
        || is_list_tool_name(&normalized)
    {
        return ToolCategory::Search;
    }
    if READ_TOOL_EXACT.contains(&normalized.as_str()) {
        return ToolCategory::Read;
    }
    if WRITE_TOOL_EXACT.contains(&normalized.as_str()) {
        return ToolCategory::Write;
    }
    ToolCategory::Other
}

fn is_list_tool_name(normalized: &str) -> bool {
    !normalized.is_empty()
        && (normalized == "list"
            || normalized.starts_with("list_")
            || normalized.starts_with("list-"))
}

fn classify_shell_command(command: &str) -> ToolCategory {
    if command.is_empty() {
        return ToolCategory::Other;
    }
    if SHELL_HEREDOC_PATTERN.is_match(command) {
        return ToolCategory::Write;
    }

    let segments = split_command_segments(command);
    let mut saw_read = false;
    let mut saw_search = false;
    for segment in segments {
        let Some(normalized) = normalize_shell_segment(&segment) else {
            continue;
        };
        for args in normalized.commands {
            if args.is_empty() {
                continue;
            }
            let binary = &args[0];
            let rest = &args[1..];
            let normalized_binary = normalize_binary_name(binary);
            let alias = COMMAND_ALIASES
                .get(normalized_binary.as_str())
                .copied()
                .unwrap_or(normalized_binary.as_str())
                .to_string();
            if is_write_binary(&alias, rest, &normalized.raw) {
                return ToolCategory::Write;
            }
            if is_read_binary(&alias, rest) {
                saw_read = true;
                continue;
            }
            if is_search_binary(&alias, rest) {
                saw_search = true;
            }
        }
    }
    if saw_search {
        ToolCategory::Search
    } else if saw_read {
        ToolCategory::Read
    } else {
        ToolCategory::Other
    }
}

struct NormalizedShellSegment {
    raw: String,
    commands: Vec<Vec<String>>,
}

fn normalize_shell_segment(segment: &str) -> Option<NormalizedShellSegment> {
    let trimmed = strip_shell_wrapper(segment);
    if trimmed.is_empty() {
        return None;
    }
    let tokens = split_shell_tokens(&trimmed);
    if tokens.is_empty() {
        return None;
    }
    let mut commands = Vec::new();
    let mut current = Vec::new();
    for token in tokens {
        if token == "|" {
            let cleaned = clean_command_tokens(&current);
            if !cleaned.is_empty() {
                commands.push(cleaned);
            }
            current.clear();
            continue;
        }
        current.push(token);
    }
    let cleaned = clean_command_tokens(&current);
    if !cleaned.is_empty() {
        commands.push(cleaned);
    }
    if commands.is_empty() {
        None
    } else {
        Some(NormalizedShellSegment {
            raw: trimmed,
            commands,
        })
    }
}

fn split_shell_tokens(cmd: &str) -> Vec<String> {
    let mut tokens = Vec::new();
    let mut current = String::new();
    let mut quote: Option<char> = None;
    let chars: Vec<char> = cmd.chars().collect();
    let mut i = 0usize;
    while i < chars.len() {
        let ch = chars[i];
        if let Some(active_quote) = quote {
            if ch == active_quote {
                quote = None;
            } else if ch == '\\' && active_quote == '"' && i + 1 < chars.len() {
                current.push(chars[i + 1]);
                i += 1;
            } else {
                current.push(ch);
            }
            i += 1;
            continue;
        }
        if ch == '"' || ch == '\'' {
            quote = Some(ch);
            i += 1;
            continue;
        }
        if ch.is_whitespace() {
            if !current.is_empty() {
                tokens.push(current.clone());
                current.clear();
            }
            i += 1;
            continue;
        }
        if ch == '|' {
            if !current.is_empty() {
                tokens.push(current.clone());
                current.clear();
            }
            tokens.push("|".to_string());
            i += 1;
            continue;
        }
        current.push(ch);
        i += 1;
    }
    if !current.is_empty() {
        tokens.push(current);
    }
    tokens
}

fn clean_command_tokens(tokens: &[String]) -> Vec<String> {
    let mut cleaned = Vec::new();
    for token in tokens {
        if cleaned.is_empty() {
            if ENV_ASSIGNMENT_PATTERN.is_match(token)
                || SHELL_WRAPPER_COMMANDS.contains(token.as_str())
            {
                continue;
            }
        }
        cleaned.push(token.clone());
    }
    cleaned
}

fn is_write_binary(binary: &str, args: &[String], raw_segment: &str) -> bool {
    let normalized = binary.to_lowercase();
    if SHELL_WRITE_COMMANDS.contains(normalized.as_str()) {
        return true;
    }
    if normalized == "git"
        && !args.is_empty()
        && GIT_WRITE_SUBCOMMANDS.contains(args[0].to_lowercase().as_str())
    {
        return true;
    }
    if let Some(allowed) = PACKAGE_MANAGER_COMMANDS.get(normalized.as_str()) {
        if !args.is_empty() && allowed.contains(args[0].to_lowercase().as_str()) {
            return true;
        }
    }
    if normalized == "sed" && args.join(" ").to_lowercase().contains("-i") {
        return true;
    }
    if normalized == "perl" && args.join(" ").to_lowercase().contains("-pi") {
        return true;
    }
    if normalized == "printf" && has_output_redirect(raw_segment) {
        return true;
    }
    SHELL_REDIRECT_WRITE_BINARIES.contains(normalized.as_str()) && has_output_redirect(raw_segment)
}

fn is_read_binary(binary: &str, args: &[String]) -> bool {
    let normalized = binary.to_lowercase();
    if SHELL_READ_COMMANDS.contains(normalized.as_str()) {
        return true;
    }
    if normalized == "sed" {
        return !args.join(" ").to_lowercase().contains("-i");
    }
    false
}

fn is_search_binary(binary: &str, args: &[String]) -> bool {
    let normalized = binary.to_lowercase();
    if SHELL_SEARCH_COMMANDS.contains(normalized.as_str()) {
        return true;
    }
    if normalized == "git" && contains_subcommand(args, &GIT_SEARCH_SUBCOMMANDS) {
        return true;
    }
    normalized == "bd" && contains_subcommand(args, &BD_SEARCH_SUBCOMMANDS)
}

fn contains_subcommand(args: &[String], candidates: &HashSet<&'static str>) -> bool {
    if args.is_empty() || candidates.is_empty() {
        return false;
    }
    args.iter().any(|raw| {
        let token = raw.trim().to_lowercase();
        !token.is_empty() && !token.starts_with('-') && candidates.contains(token.as_str())
    })
}

fn split_command_segments(command: &str) -> Vec<String> {
    COMMAND_SEGMENT_SPLIT_RE
        .split(command)
        .map(str::trim)
        .filter(|segment| !segment.is_empty())
        .map(str::to_string)
        .collect()
}

fn normalize_binary_name(binary: &str) -> String {
    if binary.is_empty() {
        return String::new();
    }
    let lowered = binary.to_lowercase();
    lowered.rsplit('/').next().unwrap_or("").to_string()
}

fn strip_shell_wrapper(command: &str) -> String {
    let trimmed = command.trim();
    for wrapper in ["bash -lc", "sh -c", "zsh -c"] {
        if trimmed.starts_with(wrapper) {
            let inner = trimmed[wrapper.len()..].trim();
            return strip_outer_matching_quotes(inner).to_string();
        }
    }
    strip_outer_matching_quotes(trimmed).to_string()
}

fn strip_outer_matching_quotes(text: &str) -> &str {
    if text.len() >= 2 {
        let bytes = text.as_bytes();
        let first = bytes[0];
        let last = bytes[text.len() - 1];
        if (first == b'\'' && last == b'\'') || (first == b'"' && last == b'"') {
            return &text[1..text.len() - 1];
        }
    }
    text
}

fn contains_vision_keyword(text: &str) -> bool {
    let lowered = text.to_lowercase();
    ["vision", "image", "picture", "photo"]
        .iter()
        .any(|keyword| lowered.contains(keyword))
}

fn has_output_redirect(raw_segment: &str) -> bool {
    let chars: Vec<char> = raw_segment.chars().collect();
    let mut i = 0usize;
    while i < chars.len() {
        if chars[i] != '>' {
            i += 1;
            continue;
        }

        let prev_ok = i == 0 || matches!(chars[i - 1], ' ' | '\t' | ';' | '|' | '&');
        if !prev_ok {
            i += 1;
            continue;
        }

        i += 1;
        if i < chars.len() && chars[i] == '>' {
            i += 1;
        }
        while i < chars.len() && chars[i].is_whitespace() {
            i += 1;
        }
        if i < chars.len() && chars[i] != '&' {
            return true;
        }
    }
    false
}

fn tool_category_priority(category: ToolCategory) -> i32 {
    match category {
        ToolCategory::Websearch => 4,
        ToolCategory::Write => 3,
        ToolCategory::Search => 2,
        ToolCategory::Read => 1,
        ToolCategory::Other => 0,
    }
}

#[cfg(test)]
mod tests {
    use super::{
        choose_higher_priority_tool_category, classify_tool_call_for_report, detect_coding_tool,
        detect_last_assistant_tool_category, detect_vision_tool, detect_web_search_tool_declared,
        detect_web_tool, extract_meaningful_declared_tool_names, ToolCategory, ToolClassification,
    };
    use serde_json::json;

    #[test]
    fn detects_vision_coding_and_web_tools() {
        let request = json!({
            "tools": [
                {"function":{"name":"vision_lookup","description":"photo analyzer"}},
                {"function":{"name":"apply_patch","description":"modify file"}},
                {"function":{"name":"web_fetch","description":"internet_search helper"}}
            ]
        });
        assert!(detect_vision_tool(&request));
        assert!(detect_coding_tool(&request));
        assert!(detect_web_tool(&request));
    }

    #[test]
    fn detects_explicit_web_search_and_meaningful_names() {
        let tools = json!([
            {"function":{"name":"web_search"}},
            {"function":{"name":"exec_commandarg_json"}},
            {"name":"plain_tool"}
        ]);
        assert!(detect_web_search_tool_declared(
            &json!({"tools": tools.clone()})
        ));
        assert_eq!(
            extract_meaningful_declared_tool_names(Some(&tools)),
            vec![
                "web_search".to_string(),
                "exec_commandarg_json".to_string(),
                "plain_tool".to_string()
            ]
        );
    }

    #[test]
    fn choose_higher_priority_prefers_higher_score() {
        let current = ToolClassification {
            category: ToolCategory::Read,
            name: "read".to_string(),
            command_snippet: None,
        };
        let candidate = ToolClassification {
            category: ToolCategory::Write,
            name: "write".to_string(),
            command_snippet: None,
        };
        assert_eq!(
            choose_higher_priority_tool_category(Some(&current), Some(&candidate))
                .expect("classification")
                .category,
            ToolCategory::Write
        );
    }

    #[test]
    fn classifies_shell_write_read_and_search_calls() {
        let write = classify_tool_call_for_report(&json!({
            "function":{"name":"exec_command","arguments":{"cmd":"bash -lc 'cat foo > bar'"}}
        }))
        .expect("write");
        assert_eq!(write.category, ToolCategory::Write);

        let read = classify_tool_call_for_report(&json!({
            "function":{"name":"shell_command","arguments":{"command":"cat README.md"}}
        }))
        .expect("read");
        assert_eq!(read.category, ToolCategory::Read);

        let search = classify_tool_call_for_report(&json!({
            "function":{"name":"shell","arguments":"{\"cmd\":\"rg needle src\"}"}
        }))
        .expect("search");
        assert_eq!(search.category, ToolCategory::Search);
    }

    #[test]
    fn classifies_websearch_and_write_by_name_priority() {
        let web = classify_tool_call_for_report(&json!({
            "function":{"name":"web_search","arguments":"{}"}
        }))
        .expect("web");
        assert_eq!(web.category, ToolCategory::Websearch);

        let write = classify_tool_call_for_report(&json!({
            "function":{"name":"apply_patch","arguments":"{}"}
        }))
        .expect("write");
        assert_eq!(write.category, ToolCategory::Write);
    }

    #[test]
    fn detects_last_assistant_tool_category_from_latest_tool_turn() {
        let messages = vec![
            json!({"role":"assistant","tool_calls":[
                {"function":{"name":"read_file","arguments":"{}"}}
            ]}),
            json!({"role":"assistant","tool_calls":[
                {"function":{"name":"rg_search","arguments":"{}"}},
                {"function":{"name":"apply_patch","arguments":"{}"}}
            ]}),
        ];
        let best = detect_last_assistant_tool_category(&messages).expect("best");
        assert_eq!(best.category, ToolCategory::Write);
    }
}
