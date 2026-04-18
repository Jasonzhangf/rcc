use regex::Regex;
use serde_json::Value;
use std::net::IpAddr;
use std::sync::LazyLock;
use url::Url;

static IMAGE_BLOCK_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#""type"\s*:\s*"(?:input_)?image(?:_url)?""#).expect("valid image regex")
});
static VIDEO_BLOCK_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#""type"\s*:\s*"(?:input_)?video(?:_url)?""#).expect("valid video regex")
});
static DATA_VIDEO_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"data:video/"#).expect("valid data video regex"));
static REMOTE_VIDEO_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"https?://[^\s"'\\]+"#).expect("valid remote video regex"));

const LOCAL_URL_SCHEMES: [&str; 3] = ["data:", "file:", "blob:"];
const EXTENDED_THINKING_KEYWORDS: [&str; 7] = [
    "仔细分析",
    "思考",
    "超级思考",
    "深度思考",
    "careful analysis",
    "deep thinking",
    "deliberate",
];

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MediaAttachmentSignals {
    pub has_any_media: bool,
    pub has_image: bool,
    pub has_video: bool,
    pub has_remote_video: bool,
    pub has_local_video: bool,
}

impl MediaAttachmentSignals {
    pub fn empty() -> Self {
        Self {
            has_any_media: false,
            has_image: false,
            has_video: false,
            has_remote_video: false,
            has_local_video: false,
        }
    }
}

pub fn get_latest_user_message_index(messages: &[Value]) -> Option<usize> {
    for idx in (0..messages.len()).rev() {
        if messages[idx]
            .get("role")
            .and_then(Value::as_str)
            .is_some_and(|role| role == "user")
        {
            return Some(idx);
        }
    }
    None
}

pub fn get_latest_message_role(messages: &[Value]) -> Option<String> {
    let last = messages.last()?;
    let role = last.get("role").and_then(Value::as_str)?.trim();
    (!role.is_empty()).then(|| role.to_string())
}

pub fn extract_message_text(message: &Value) -> String {
    let Some(content) = message.get("content") else {
        return String::new();
    };

    if let Some(text) = content.as_str() {
        if !text.trim().is_empty() {
            return text.to_string();
        }
    }

    let Some(parts) = content.as_array() else {
        return String::new();
    };
    let mut out = Vec::new();
    for entry in parts {
        if let Some(text) = entry.as_str() {
            if !text.trim().is_empty() {
                out.push(text.to_string());
            }
            continue;
        }
        let Some(record) = entry.as_object() else {
            continue;
        };
        if let Some(text) = record.get("text").and_then(Value::as_str) {
            if !text.trim().is_empty() {
                out.push(text.to_string());
                continue;
            }
        }
        if let Some(text) = record.get("content").and_then(Value::as_str) {
            if !text.trim().is_empty() {
                out.push(text.to_string());
            }
        }
    }
    let joined = out.join("\n").trim().to_string();
    if joined.is_empty() {
        String::new()
    } else {
        joined
    }
}

pub fn detect_keyword(text: &str, keywords: &[&str]) -> bool {
    if text.is_empty() {
        return false;
    }
    keywords
        .iter()
        .any(|keyword| text.contains(&keyword.to_lowercase()))
}

pub fn detect_extended_thinking_keyword(text: &str) -> bool {
    if text.is_empty() {
        return false;
    }
    EXTENDED_THINKING_KEYWORDS
        .iter()
        .any(|keyword| text.contains(keyword))
}

pub fn analyze_media_attachments(message: Option<&Value>) -> MediaAttachmentSignals {
    let Some(message) = message else {
        return MediaAttachmentSignals::empty();
    };
    let mut result = MediaAttachmentSignals::empty();

    if let Some(raw) = message.get("content").and_then(Value::as_str) {
        if !raw.trim().is_empty() {
            let has_image_block = IMAGE_BLOCK_RE.is_match(raw);
            let has_video_block = VIDEO_BLOCK_RE.is_match(raw);
            let has_data_video = DATA_VIDEO_RE.is_match(raw);
            let has_remote_video = REMOTE_VIDEO_RE.is_match(raw);
            if has_image_block || has_video_block {
                result.has_any_media = true;
            }
            if has_image_block {
                result.has_image = true;
            }
            if has_video_block {
                result.has_video = true;
                if has_data_video {
                    result.has_local_video = true;
                }
                if has_remote_video {
                    result.has_remote_video = true;
                }
                if !has_data_video && !has_remote_video {
                    result.has_local_video = true;
                }
            }
            if result.has_any_media {
                return result;
            }
        }
    }

    let Some(parts) = message.get("content").and_then(Value::as_array) else {
        return result;
    };

    for part in parts {
        let Some(record) = part.as_object() else {
            continue;
        };
        let type_value = record
            .get("type")
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_lowercase();
        let Some(media_kind) = resolve_media_kind(&type_value, record) else {
            continue;
        };
        let media_url = extract_media_url_candidate(record).trim().to_string();
        if media_url.is_empty() {
            continue;
        }
        result.has_any_media = true;
        if media_kind == "image" {
            result.has_image = true;
            continue;
        }
        result.has_video = true;
        if is_remote_public_http_url(&media_url) {
            result.has_remote_video = true;
        } else {
            result.has_local_video = true;
        }
    }

    result
}

pub fn detect_image_attachment(message: Option<&Value>) -> bool {
    analyze_media_attachments(message).has_any_media
}

fn extract_media_url_candidate(record: &serde_json::Map<String, Value>) -> String {
    if let Some(url) = record.get("image_url").and_then(Value::as_str) {
        return url.to_string();
    }
    if let Some(url) = record.get("video_url").and_then(Value::as_str) {
        return url.to_string();
    }
    for key in ["image_url", "video_url"] {
        if let Some(url) = record
            .get(key)
            .and_then(Value::as_object)
            .and_then(|value| value.get("url"))
            .and_then(Value::as_str)
        {
            return url.to_string();
        }
    }
    for key in ["url", "uri", "data"] {
        if let Some(url) = record.get(key).and_then(Value::as_str) {
            return url.to_string();
        }
    }
    String::new()
}

fn resolve_media_kind(
    type_value: &str,
    record: &serde_json::Map<String, Value>,
) -> Option<&'static str> {
    if type_value.contains("video") {
        return Some("video");
    }
    if type_value.contains("image") {
        return Some("image");
    }
    if record.contains_key("video_url") {
        return Some("video");
    }
    if record.contains_key("image_url") {
        return Some("image");
    }
    None
}

fn is_private_host(host: &str) -> bool {
    let normalized = host.trim().to_lowercase();
    if normalized.is_empty() {
        return true;
    }
    if normalized == "localhost" || normalized.ends_with(".local") {
        return true;
    }
    if let Ok(ip) = normalized.parse::<IpAddr>() {
        return match ip {
            IpAddr::V4(ipv4) => {
                let octets = ipv4.octets();
                octets[0] == 10
                    || octets[0] == 127
                    || octets[0] == 0
                    || (octets[0] == 169 && octets[1] == 254)
                    || (octets[0] == 172 && (16..=31).contains(&octets[1]))
                    || (octets[0] == 192 && octets[1] == 168)
            }
            IpAddr::V6(ipv6) => {
                normalized == "::1"
                    || normalized.starts_with("fc")
                    || normalized.starts_with("fd")
                    || normalized.starts_with("fe80:")
                    || ipv6.is_loopback()
            }
        };
    }
    false
}

fn is_remote_public_http_url(raw: &str) -> bool {
    let value = raw.trim();
    if value.is_empty() {
        return false;
    }
    let lowered = value.to_lowercase();
    if LOCAL_URL_SCHEMES
        .iter()
        .any(|prefix| lowered.starts_with(prefix))
    {
        return false;
    }
    let Ok(parsed) = Url::parse(value) else {
        return false;
    };
    if parsed.scheme() != "http" && parsed.scheme() != "https" {
        return false;
    }
    parsed.host_str().is_some_and(|host| !is_private_host(host))
}

#[cfg(test)]
mod tests {
    use super::{
        analyze_media_attachments, detect_extended_thinking_keyword, detect_image_attachment,
        detect_keyword, extract_message_text, get_latest_message_role,
        get_latest_user_message_index, MediaAttachmentSignals,
    };
    use serde_json::json;

    #[test]
    fn finds_latest_user_message_and_role() {
        let messages = vec![
            json!({"role":"system","content":"a"}),
            json!({"role":"user","content":"b"}),
            json!({"role":"assistant","content":"c"}),
            json!({"role":"user","content":"d"}),
        ];
        assert_eq!(get_latest_user_message_index(&messages), Some(3));
        assert_eq!(get_latest_message_role(&messages), Some("user".to_string()));
    }

    #[test]
    fn extracts_message_text_from_string_and_parts() {
        assert_eq!(extract_message_text(&json!({"content":" hi "})), " hi ");
        assert_eq!(
            extract_message_text(&json!({"content":[" a ", {"text":"b"}, {"content":" c "}]})),
            "a \nb\n c"
        );
    }

    #[test]
    fn detect_keyword_keeps_old_lowercase_only_semantics() {
        assert!(detect_keyword("hello websearch world", &["WEBSEARCH"]));
        assert!(!detect_keyword("Hello WEBSEARCH World", &["WEBSEARCH"]));
    }

    #[test]
    fn detects_extended_thinking_keywords() {
        assert!(detect_extended_thinking_keyword("请仔细分析这个问题"));
        assert!(detect_extended_thinking_keyword("need deep thinking here"));
        assert!(!detect_extended_thinking_keyword("quick answer"));
    }

    #[test]
    fn analyzes_string_media_blocks() {
        let result = analyze_media_attachments(Some(&json!({
            "content":"{\"type\":\"video_url\",\"url\":\"https://example.com/video.mp4\"}"
        })));
        assert_eq!(
            result,
            MediaAttachmentSignals {
                has_any_media: true,
                has_image: false,
                has_video: true,
                has_remote_video: true,
                has_local_video: false,
            }
        );
    }

    #[test]
    fn analyzes_array_media_parts_and_private_hosts() {
        let result = analyze_media_attachments(Some(&json!({
            "content":[
                {"type":"image_url","image_url":{"url":"https://example.com/a.png"}},
                {"type":"video_url","video_url":{"url":"http://127.0.0.1/test.mp4"}},
                {"type":"video_url","video_url":{"url":"data:video/mp4;base64,abc"}}
            ]
        })));
        assert!(result.has_any_media);
        assert!(result.has_image);
        assert!(result.has_video);
        assert!(!result.has_remote_video);
        assert!(result.has_local_video);
    }

    #[test]
    fn skips_media_parts_without_urls() {
        let result = analyze_media_attachments(Some(&json!({
            "content":[{"type":"image_url"}]
        })));
        assert_eq!(result, MediaAttachmentSignals::empty());
    }

    #[test]
    fn detect_image_attachment_uses_has_any_media_semantics() {
        assert!(detect_image_attachment(Some(&json!({
            "content":[{"type":"video_url","video_url":"https://example.com/v.mp4"}]
        }))));
        assert!(!detect_image_attachment(None));
    }
}
