use regex::Regex;
use std::sync::OnceLock;

fn begin_patch_regex() -> &'static Regex {
    static REGEX: OnceLock<Regex> = OnceLock::new();
    REGEX.get_or_init(|| {
        Regex::new(r"^(?:\s*)\*\*\*\s*Begin Patch\b").expect("valid begin patch regex")
    })
}

fn file_header_regex() -> &'static Regex {
    static REGEX: OnceLock<Regex> = OnceLock::new();
    REGEX.get_or_init(|| {
        Regex::new(r"^(?:\s*)\*\*\*\s*(?:Update|Add|Create|Delete)\s+File:")
            .expect("valid file header regex")
    })
}

fn diff_git_regex() -> &'static Regex {
    static REGEX: OnceLock<Regex> = OnceLock::new();
    REGEX.get_or_init(|| Regex::new(r"^diff --git\s").expect("valid diff --git regex"))
}

fn hunk_or_diff_marker_regex() -> &'static Regex {
    static REGEX: OnceLock<Regex> = OnceLock::new();
    REGEX.get_or_init(|| {
        Regex::new(r"^(?:@@|\+\+\+\s|---\s)").expect("valid hunk/diff marker regex")
    })
}

pub fn looks_like_patch(text: &str) -> bool {
    if text.is_empty() {
        return false;
    }
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return false;
    }

    begin_patch_regex().is_match(trimmed)
        || file_header_regex().is_match(trimmed)
        || diff_git_regex().is_match(trimmed)
        || hunk_or_diff_marker_regex().is_match(trimmed)
}

pub fn is_apply_patch_payload_candidate(value: &str) -> bool {
    let text = value.trim();
    if text.is_empty() {
        return false;
    }

    text.starts_with("*** Begin Patch")
        || text.starts_with("*** Update File:")
        || text.starts_with("*** Add File:")
        || text.starts_with("*** Delete File:")
        || text.starts_with("--- a/")
        || text.starts_with("--- ")
}

#[cfg(test)]
mod tests {
    use super::{is_apply_patch_payload_candidate, looks_like_patch};

    #[test]
    fn looks_like_patch_rejects_empty_text() {
        assert!(!looks_like_patch(""));
        assert!(!looks_like_patch("   \n\t "));
    }

    #[test]
    fn looks_like_patch_detects_internal_patch_markers() {
        assert!(looks_like_patch("*** Begin Patch\n*** End Patch"));
        assert!(looks_like_patch("*** Update File: src/a.rs"));
        assert!(looks_like_patch("*** Add File: src/a.rs"));
    }

    #[test]
    fn looks_like_patch_detects_git_diff_and_hunk_markers() {
        assert!(looks_like_patch("diff --git a/a.txt b/a.txt"));
        assert!(looks_like_patch("@@\n-old\n+new"));
        assert!(looks_like_patch("--- a/file.txt\n+++ b/file.txt"));
    }

    #[test]
    fn looks_like_patch_rejects_plain_non_patch_text() {
        assert!(!looks_like_patch("hello world"));
        assert!(!looks_like_patch("apply_patch please edit this file"));
    }

    #[test]
    fn payload_candidate_accepts_supported_prefixes_after_trim() {
        assert!(is_apply_patch_payload_candidate(
            "   *** Begin Patch\n*** End Patch"
        ));
        assert!(is_apply_patch_payload_candidate(
            "*** Update File: src/lib.rs"
        ));
        assert!(is_apply_patch_payload_candidate("*** Add File: src/new.rs"));
        assert!(is_apply_patch_payload_candidate(
            "*** Delete File: src/old.rs"
        ));
        assert!(is_apply_patch_payload_candidate("--- a/src/lib.rs"));
        assert!(is_apply_patch_payload_candidate("--- src/lib.rs"));
    }

    #[test]
    fn payload_candidate_rejects_unsupported_text() {
        assert!(!is_apply_patch_payload_candidate(""));
        assert!(!is_apply_patch_payload_candidate("diff --git a/a b/b"));
        assert!(!is_apply_patch_payload_candidate(
            "apply_patch *** Begin Patch"
        ));
        assert!(!is_apply_patch_payload_candidate("hello world"));
    }
}
