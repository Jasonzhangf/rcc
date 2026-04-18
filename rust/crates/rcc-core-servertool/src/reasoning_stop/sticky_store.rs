use serde_json::{json, Map, Value};
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process;
use std::time::{SystemTime, UNIX_EPOCH};

pub fn save_reasoning_stop_sticky_state(payload: &Value) -> Option<Value> {
    let record = payload.as_object()?;
    let sticky_key = read_sticky_key(record)?;
    let session_dir = record.get("session_dir").and_then(Value::as_str);
    let state = record.get("state")?;

    match state {
        Value::Object(state_record) => {
            save_sticky_state_object(sticky_key, session_dir, Some(state_record)).map(|_| {
                json!({
                    "sticky_key": sticky_key,
                    "state": Value::Object(state_record.clone())
                })
            })
        }
        Value::Null => save_sticky_state_object(sticky_key, session_dir, None).map(|_| {
            json!({
                "sticky_key": sticky_key,
                "state": Value::Null
            })
        }),
        _ => None,
    }
}

pub fn load_reasoning_stop_sticky_state(payload: &Value) -> Option<Value> {
    let record = payload.as_object()?;
    let sticky_key = read_sticky_key(record)?;
    let session_dir = record.get("session_dir").and_then(Value::as_str);
    let state = load_sticky_state_value(sticky_key, session_dir)?;

    Some(json!({
        "sticky_key": sticky_key,
        "state": state
    }))
}

pub(crate) fn load_sticky_state_object(
    sticky_key: &str,
    session_dir: Option<&str>,
) -> Option<Option<Map<String, Value>>> {
    match load_sticky_state_value(sticky_key, session_dir)? {
        Value::Null => Some(None),
        Value::Object(record) => Some(Some(record)),
        _ => None,
    }
}

pub(crate) fn save_sticky_state_object(
    sticky_key: &str,
    session_dir: Option<&str>,
    state: Option<&Map<String, Value>>,
) -> Option<()> {
    let filepath = resolve_sticky_filepath_from_parts(sticky_key, session_dir)?;
    match state {
        Some(state_record) => {
            if let Some(parent) = filepath.parent() {
                fs::create_dir_all(parent).ok()?;
            }
            let raw = serde_json::to_string(&json!({
                "version": 1,
                "state": Value::Object(state_record.clone())
            }))
            .ok()?;
            atomic_write_file_sync(&filepath, &raw).ok()?;
            Some(())
        }
        None => {
            match fs::remove_file(&filepath) {
                Ok(_) => {}
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
                Err(_) => return None,
            }
            Some(())
        }
    }
}

fn read_sticky_key<'a>(record: &'a Map<String, Value>) -> Option<&'a str> {
    let key = record.get("sticky_key")?.as_str()?.trim();
    let _ = parse_sticky_key(key)?;
    Some(key)
}

fn resolve_sticky_filepath_from_parts(
    sticky_key: &str,
    session_dir: Option<&str>,
) -> Option<PathBuf> {
    let (scope, safe_id) = parse_sticky_key(sticky_key)?;
    let dir = session_dir
        .map(str::trim)
        .filter(|dir| !dir.is_empty())
        .map(expand_home)
        .or_else(|| resolve_default_storage_dir(scope))?;
    Some(dir.join(format!("{scope}-{safe_id}.json")))
}

fn parse_sticky_key(key: &str) -> Option<(&str, String)> {
    let idx = key.find(':')?;
    if idx == 0 || idx == key.len() - 1 {
        return None;
    }
    let scope = &key[..idx];
    if scope != "session" && scope != "conversation" && scope != "tmux" {
        return None;
    }
    let raw_id = &key[idx + 1..];
    let safe_id: String = raw_id
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || ch == '_' || ch == '.' || ch == '-' {
                ch
            } else {
                '_'
            }
        })
        .collect();
    if safe_id.is_empty() {
        return None;
    }
    Some((scope, safe_id))
}

fn resolve_default_storage_dir(scope: &str) -> Option<PathBuf> {
    if scope == "tmux" {
        if let Some(override_dir) = env::var("ROUTECODEX_SESSION_DIR")
            .ok()
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
        {
            return Some(expand_home(&override_dir));
        }
        return Some(resolve_rcc_user_dir()?.join("sessions"));
    }

    Some(resolve_rcc_user_dir()?.join("state").join("routing"))
}

fn resolve_rcc_user_dir() -> Option<PathBuf> {
    for key in ["RCC_HOME", "ROUTECODEX_USER_DIR", "ROUTECODEX_HOME"] {
        let Some(value) = env::var(key).ok() else {
            continue;
        };
        let trimmed = value.trim();
        if trimmed.is_empty() {
            continue;
        }
        let expanded = expand_home(trimmed);
        if is_legacy_routecodex_dir(&expanded) {
            continue;
        }
        return Some(expanded);
    }

    let home = env::var("HOME").ok()?;
    let home = home.trim();
    if home.is_empty() {
        return None;
    }
    Some(PathBuf::from(home).join(".rcc"))
}

fn is_legacy_routecodex_dir(path: &Path) -> bool {
    let Some(home) = env::var("HOME")
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
    else {
        return false;
    };
    path == PathBuf::from(home).join(".routecodex")
}

fn expand_home(value: &str) -> PathBuf {
    if let Some(rest) = value.strip_prefix("~/") {
        if let Some(home) = env::var("HOME")
            .ok()
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
        {
            return PathBuf::from(home).join(rest);
        }
    }
    PathBuf::from(value)
}

fn parse_persisted_state(raw: &str) -> Option<Value> {
    let parsed = serde_json::from_str::<Value>(raw).ok()?;
    let record = parsed.as_object()?;
    if record
        .get("version")
        .and_then(Value::as_i64)
        .is_some_and(|version| version >= 1)
        && record.contains_key("state")
    {
        return match record.get("state") {
            Some(Value::Object(state)) => Some(Value::Object(state.clone())),
            Some(Value::Null) => Some(Value::Null),
            _ => None,
        };
    }
    Some(Value::Object(record.clone()))
}

fn load_sticky_state_value(sticky_key: &str, session_dir: Option<&str>) -> Option<Value> {
    let filepath = resolve_sticky_filepath_from_parts(sticky_key, session_dir)?;

    match fs::read_to_string(&filepath) {
        Ok(raw) => parse_persisted_state(&raw),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Some(Value::Null),
        Err(_) => None,
    }
}

fn atomic_write_file_sync(filepath: &Path, content: &str) -> std::io::Result<()> {
    let tmp = filepath.with_extension(format!(
        "tmp-{}-{}",
        process::id(),
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|value| value.as_nanos())
            .unwrap_or(0)
    ));
    fs::write(&tmp, content)?;
    match fs::rename(&tmp, filepath) {
        Ok(_) => {}
        Err(_) => {
            match fs::remove_file(filepath) {
                Ok(_) => {}
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
                Err(error) => return Err(error),
            }
            fs::rename(&tmp, filepath)?;
        }
    }
    match fs::remove_file(&tmp) {
        Ok(_) => {}
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
        Err(error) => return Err(error),
    }
    Ok(())
}
