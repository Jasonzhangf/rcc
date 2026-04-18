use regex::Regex;
use serde_json::Value;
use std::sync::OnceLock;

pub fn sanitize_followup_text(raw: &Value) -> String {
    let Some(raw) = raw.as_str() else {
        return String::new();
    };
    if raw.trim().is_empty() {
        return String::new();
    }

    let cleaned = stopmessage_marker_re().replace_all(raw, " ");
    let cleaned = strip_time_tag_blocks(cleaned.as_ref());
    let cleaned = image_omitted_re().replace_all(&cleaned, " ");
    let cleaned = space_before_newline_re().replace_all(&cleaned, "\n");
    let cleaned = space_after_newline_re().replace_all(&cleaned, "\n");
    collapse_blank_lines(cleaned.as_ref())
}

pub fn sanitize_followup_snapshot_text(raw: &Value) -> String {
    sanitize_followup_text(raw)
}

fn collapse_blank_lines(text: &str) -> String {
    blank_lines_re()
        .replace_all(text, "\n\n")
        .trim()
        .to_string()
}

fn stopmessage_marker_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"<\*\*[\s\S]*?\*\*>").expect("valid regex"))
}

fn image_omitted_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"\[Image omitted\]").expect("valid regex"))
}

fn space_before_newline_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"[ \t]+\n").expect("valid regex"))
}

fn space_after_newline_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"\n[ \t]+").expect("valid regex"))
}

fn blank_lines_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"\n{3,}").expect("valid regex"))
}

fn strip_time_tag_blocks(text: &str) -> String {
    const PREFIX: &str = "[Time/Date]:";
    let mut out = String::with_capacity(text.len());
    let mut i = 0;

    while i < text.len() {
        let rest = &text[i..];
        if rest.starts_with(PREFIX) {
            out.push(' ');
            i += PREFIX.len();
            while i < text.len() {
                let tail = &text[i..];
                if tail.starts_with("\\n") || tail.starts_with('\n') {
                    break;
                }
                let ch = tail.chars().next().expect("char");
                i += ch.len_utf8();
            }
            continue;
        }

        let ch = rest.chars().next().expect("char");
        out.push(ch);
        i += ch.len_utf8();
    }

    out
}

#[cfg(test)]
mod tests {
    use super::{sanitize_followup_snapshot_text, sanitize_followup_text};
    use serde_json::{json, Value};

    #[test]
    fn non_content_input_returns_empty_string() {
        assert_eq!(sanitize_followup_text(&Value::Null), "");
        assert_eq!(sanitize_followup_text(&json!(42)), "");
        assert_eq!(sanitize_followup_text(&json!("")), "");
        assert_eq!(sanitize_followup_text(&json!("   ")), "");
    }

    #[test]
    fn removes_markers_time_tags_and_image_placeholders() {
        let raw =
            json!("<** stopMessage:\"继续\" **>\n[Time/Date]: 2026-04-17\nHello\n[Image omitted]");
        assert_eq!(sanitize_followup_text(&raw), "Hello");
    }

    #[test]
    fn trims_spaces_around_newlines_and_collapses_blank_lines() {
        let raw = json!("A   \n   B\n\n\nC");
        assert_eq!(sanitize_followup_text(&raw), "A\nB\n\nC");
    }

    #[test]
    fn snapshot_variant_matches_main_sanitizer() {
        let raw = json!(" \n[Image omitted]\n继续执行\n");
        assert_eq!(
            sanitize_followup_snapshot_text(&raw),
            sanitize_followup_text(&raw)
        );
    }

    #[test]
    fn strips_time_tag_until_literal_backslash_n_boundary() {
        let raw = json!("A[Time/Date]: hidden\\nB");
        assert_eq!(sanitize_followup_text(&raw), "A \\nB");
    }
}
