use regex::Regex;
use std::sync::OnceLock;

const ALLOWED_TOOL_NAMES: &[&str] = &[
    "shell",
    "shell_command",
    "bash",
    "exec_command",
    "apply_patch",
    "update_plan",
    "view_image",
    "list_mcp_resources",
    "read_mcp_resource",
    "list_mcp_resource_templates",
];

fn write_redirection_regex() -> &'static Regex {
    static REGEX: OnceLock<Regex> = OnceLock::new();
    REGEX.get_or_init(|| Regex::new(r">\s*[^\s<]").expect("valid write redirection regex"))
}

fn sed_in_place_regex() -> &'static Regex {
    static REGEX: OnceLock<Regex> = OnceLock::new();
    REGEX.get_or_init(|| Regex::new(r"\bsed\b[^\n]*-i\b").expect("valid sed -i regex"))
}

fn ed_script_regex() -> &'static Regex {
    static REGEX: OnceLock<Regex> = OnceLock::new();
    REGEX.get_or_init(|| Regex::new(r"\bed\b[^\n]*-s\b").expect("valid ed -s regex"))
}

fn tee_regex() -> &'static Regex {
    static REGEX: OnceLock<Regex> = OnceLock::new();
    REGEX.get_or_init(|| Regex::new(r"\btee\b\s+").expect("valid tee regex"))
}

fn image_path_regex() -> &'static Regex {
    static REGEX: OnceLock<Regex> = OnceLock::new();
    REGEX.get_or_init(|| {
        Regex::new(r"\.(png|jpg|jpeg|gif|webp|bmp|svg|tiff?|ico|heic|jxl)$")
            .expect("valid image path regex")
    })
}

pub fn allowed_tool_names() -> &'static [&'static str] {
    ALLOWED_TOOL_NAMES
}

pub fn is_allowed_tool_name(name: &str) -> bool {
    ALLOWED_TOOL_NAMES.contains(&name)
}

pub fn detect_forbidden_write(script: &str) -> bool {
    let normalized = script.to_lowercase();
    if normalized.is_empty() {
        return false;
    }

    write_redirection_regex().is_match(&normalized)
        || normalized.contains("<<<")
        || normalized.contains("<<")
        || sed_in_place_regex().is_match(&normalized)
        || ed_script_regex().is_match(&normalized)
        || tee_regex().is_match(&normalized)
}

pub fn is_image_path(path: &str) -> bool {
    !path.trim().is_empty() && image_path_regex().is_match(&path.to_lowercase())
}

#[cfg(test)]
mod tests {
    use super::{allowed_tool_names, detect_forbidden_write, is_allowed_tool_name, is_image_path};

    #[test]
    fn returns_allowed_tool_names_in_old_registry_order() {
        assert_eq!(
            allowed_tool_names(),
            &[
                "shell",
                "shell_command",
                "bash",
                "exec_command",
                "apply_patch",
                "update_plan",
                "view_image",
                "list_mcp_resources",
                "read_mcp_resource",
                "list_mcp_resource_templates",
            ]
        );
    }

    #[test]
    fn recognizes_allowed_tool_name() {
        assert!(is_allowed_tool_name("exec_command"));
        assert!(!is_allowed_tool_name("unknown_tool"));
    }

    #[test]
    fn detects_write_redirection_and_tee_patterns() {
        assert!(detect_forbidden_write("echo hi > out.txt"));
        assert!(detect_forbidden_write("echo hi >> out.txt"));
        assert!(detect_forbidden_write("cat file | tee out.txt"));
    }

    #[test]
    fn detects_heredoc_and_case_insensitive_editors() {
        assert!(detect_forbidden_write("cat <<EOF"));
        assert!(detect_forbidden_write("python <<< 'print(1)'"));
        assert!(detect_forbidden_write("SED -i 's/a/b/' file.txt"));
        assert!(detect_forbidden_write("ED -s file.txt"));
    }

    #[test]
    fn allows_safe_read_only_script_shapes() {
        assert!(!detect_forbidden_write(""));
        assert!(!detect_forbidden_write("grep foo input.txt"));
        assert!(!detect_forbidden_write("cat < input.txt"));
    }

    #[test]
    fn accepts_supported_image_extensions_case_insensitively() {
        assert!(is_image_path("image.png"));
        assert!(is_image_path("photo.JPEG"));
        assert!(is_image_path("diagram.SVG"));
        assert!(is_image_path("texture.jxl"));
    }

    #[test]
    fn rejects_non_image_paths() {
        assert!(!is_image_path(""));
        assert!(!is_image_path("README.md"));
        assert!(!is_image_path("folder/image.png.bak"));
    }

    #[test]
    fn keeps_old_non_trimmed_path_matching_behavior() {
        assert!(!is_image_path(" image.png "));
    }
}
