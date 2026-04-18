use crate::read_pre_command_token;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PreCommandDirective {
    Default,
    Clear,
    Explicit(String),
}

pub fn parse_pre_command_directive(instruction: &str) -> Option<PreCommandDirective> {
    let trimmed = instruction.trim();
    if trimmed.is_empty() {
        return None;
    }

    if trimmed.eq_ignore_ascii_case("precommand") {
        return Some(PreCommandDirective::Default);
    }

    let Some(prefix_end) = precommand_prefix_end(trimmed) else {
        return None;
    };

    let body = trimmed[prefix_end..].trim();
    if body.is_empty() {
        return None;
    }

    let token = read_pre_command_token(body)?;
    let normalized = token.trim();
    if normalized.is_empty() {
        return None;
    }

    if matches_keyword(normalized, &["clear", "off", "none"]) {
        return Some(PreCommandDirective::Clear);
    }
    if normalized.eq_ignore_ascii_case("on") {
        return Some(PreCommandDirective::Default);
    }

    Some(PreCommandDirective::Explicit(normalized.to_string()))
}

fn precommand_prefix_end(value: &str) -> Option<usize> {
    let bytes = value.as_bytes();
    if bytes.len() < "precommand:".len() {
        return None;
    }
    if !value[.."precommand".len()].eq_ignore_ascii_case("precommand") {
        return None;
    }
    let mut idx = "precommand".len();
    while idx < bytes.len() && bytes[idx].is_ascii_whitespace() {
        idx += 1;
    }
    if idx >= bytes.len() || bytes[idx] != b':' {
        return None;
    }
    Some(idx + 1)
}

fn matches_keyword(value: &str, keywords: &[&str]) -> bool {
    keywords
        .iter()
        .any(|keyword| value.eq_ignore_ascii_case(keyword))
}

#[cfg(test)]
mod tests {
    use super::{parse_pre_command_directive, PreCommandDirective};

    #[test]
    fn empty_or_unrelated_input_returns_none() {
        assert_eq!(parse_pre_command_directive("   "), None);
        assert_eq!(parse_pre_command_directive("stopmessage:on"), None);
    }

    #[test]
    fn bare_precommand_means_default() {
        assert_eq!(
            parse_pre_command_directive("  PreCommand  "),
            Some(PreCommandDirective::Default)
        );
    }

    #[test]
    fn prefixed_body_is_required() {
        assert_eq!(parse_pre_command_directive("precommand:"), None);
        assert_eq!(parse_pre_command_directive("precommand   :   "), None);
    }

    #[test]
    fn clear_and_on_keywords_map_to_expected_directives() {
        assert_eq!(
            parse_pre_command_directive("precommand: clear"),
            Some(PreCommandDirective::Clear)
        );
        assert_eq!(
            parse_pre_command_directive("precommand: OFF"),
            Some(PreCommandDirective::Clear)
        );
        assert_eq!(
            parse_pre_command_directive("precommand: on"),
            Some(PreCommandDirective::Default)
        );
    }

    #[test]
    fn explicit_token_is_trimmed_and_unquoted_via_shared_reader() {
        assert_eq!(
            parse_pre_command_directive("precommand:  \" ./script.sh \" , later"),
            Some(PreCommandDirective::Explicit("./script.sh".to_string()))
        );
    }
}
