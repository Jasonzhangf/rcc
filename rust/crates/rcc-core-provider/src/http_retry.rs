use serde_json::{json, Value};

pub const DEFAULT_HTTP_MAX_ATTEMPTS: i64 = 1;
const MAX_HTTP_RETRY_DELAY_MS: i64 = 2_000;

pub fn get_http_retry_limit(payload: &Value) -> Option<Value> {
    Some(json!({
        "max_attempts": resolve_http_retry_limit(payload)
    }))
}

pub fn should_retry_http_error(payload: &Value) -> Option<Value> {
    let record = payload.as_object()?;
    let error = record.get("error")?;
    let attempt = read_i64(record.get("attempt")).unwrap_or(1).max(1);
    let max_attempts = read_i64(record.get("max_attempts"))
        .unwrap_or_else(|| resolve_http_retry_limit(payload))
        .max(DEFAULT_HTTP_MAX_ATTEMPTS);

    Some(json!({
        "retry": should_retry_http_error_value(error, attempt, max_attempts)
    }))
}

pub fn resolve_http_retry_delay_ms(payload: &Value) -> Option<Value> {
    let record = payload.as_object()?;
    let attempt = read_i64(record.get("attempt")).unwrap_or(1).max(1);
    Some(json!({
        "delay_ms": resolve_http_retry_delay_ms_value(attempt)
    }))
}

pub(crate) fn resolve_http_retry_limit(payload: &Value) -> i64 {
    payload
        .get("retry")
        .and_then(Value::as_object)
        .and_then(|retry| {
            read_i64(retry.get("max_attempts")).or_else(|| read_i64(retry.get("maxAttempts")))
        })
        .unwrap_or(DEFAULT_HTTP_MAX_ATTEMPTS)
        .max(DEFAULT_HTTP_MAX_ATTEMPTS)
}

pub(crate) fn should_retry_http_error_value(
    error: &Value,
    attempt: i64,
    max_attempts: i64,
) -> bool {
    if attempt >= max_attempts {
        return false;
    }

    error
        .get("status")
        .and_then(|value| read_i64(Some(value)))
        .is_some_and(|status| status >= 500)
}

pub(crate) fn resolve_http_retry_delay_ms_value(attempt: i64) -> i64 {
    (500 * attempt.max(1)).min(MAX_HTTP_RETRY_DELAY_MS)
}

fn read_i64(value: Option<&Value>) -> Option<i64> {
    match value? {
        Value::Number(number) => number.as_f64(),
        _ => None,
    }
    .filter(|value| value.is_finite())
    .map(|value| value.floor().max(0.0) as i64)
}

#[cfg(test)]
mod tests {
    use super::{
        get_http_retry_limit, resolve_http_retry_delay_ms, should_retry_http_error,
        DEFAULT_HTTP_MAX_ATTEMPTS,
    };
    use serde_json::json;

    #[test]
    fn get_http_retry_limit_defaults_to_single_attempt() {
        let result = get_http_retry_limit(&json!({})).expect("retry limit");
        assert_eq!(result, json!({ "max_attempts": DEFAULT_HTTP_MAX_ATTEMPTS }));
    }

    #[test]
    fn should_retry_http_error_only_retries_5xx_before_final_attempt() {
        let retry = should_retry_http_error(&json!({
            "error": { "status": 502 },
            "attempt": 1,
            "max_attempts": 2
        }))
        .expect("retry");
        assert_eq!(retry, json!({ "retry": true }));

        let final_attempt = should_retry_http_error(&json!({
            "error": { "status": 502 },
            "attempt": 2,
            "max_attempts": 2
        }))
        .expect("retry");
        assert_eq!(final_attempt, json!({ "retry": false }));

        let client_error = should_retry_http_error(&json!({
            "error": { "status": 429 },
            "attempt": 1,
            "max_attempts": 2
        }))
        .expect("retry");
        assert_eq!(client_error, json!({ "retry": false }));
    }

    #[test]
    fn resolve_http_retry_delay_ms_caps_backoff() {
        let result = resolve_http_retry_delay_ms(&json!({ "attempt": 10 })).expect("delay");
        assert_eq!(result, json!({ "delay_ms": 2000 }));
    }
}
