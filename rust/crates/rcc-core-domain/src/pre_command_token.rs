pub fn read_pre_command_token(body: &str) -> Option<String> {
    if body.is_empty() {
        return None;
    }

    let first = body.chars().next()?;
    if first == '"' || first == '\'' {
        let end = find_closing_quote(body, first)?;
        if end == 0 {
            return None;
        }
        return Some(
            body[1..end]
                .replace(r#"\""#, '"'.to_string().as_str())
                .replace(r#"\'"#, "'"),
        );
    }

    if let Some(comma) = body.find(',') {
        return Some(body[..comma].trim().to_string());
    }

    Some(body.trim().to_string())
}

fn find_closing_quote(text: &str, quote: char) -> Option<usize> {
    let mut escaped = false;
    for (idx, ch) in text.char_indices().skip(1) {
        if escaped {
            escaped = false;
            continue;
        }
        if ch == '\\' {
            escaped = true;
            continue;
        }
        if ch == quote {
            return Some(idx);
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::read_pre_command_token;

    #[test]
    fn empty_body_returns_none() {
        assert_eq!(read_pre_command_token(""), None);
    }

    #[test]
    fn quoted_body_requires_closing_quote() {
        assert_eq!(read_pre_command_token("\"unterminated"), None);
        assert_eq!(read_pre_command_token("'unterminated"), None);
    }

    #[test]
    fn quoted_body_returns_unescaped_content() {
        assert_eq!(
            read_pre_command_token("\"a\\\"b\" , ignored"),
            Some("a\"b".to_string())
        );
        assert_eq!(
            read_pre_command_token("'a\\\'b', ignored"),
            Some("a'b".to_string())
        );
    }

    #[test]
    fn unquoted_body_uses_first_comma_and_trim() {
        assert_eq!(
            read_pre_command_token("  ./script.sh  , later"),
            Some("./script.sh".to_string())
        );
    }

    #[test]
    fn body_without_comma_returns_trimmed_whole_text() {
        assert_eq!(
            read_pre_command_token("  ./script.sh  "),
            Some("./script.sh".to_string())
        );
    }
}
