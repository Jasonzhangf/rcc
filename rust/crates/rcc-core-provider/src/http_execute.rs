use crate::http_retry::{
    resolve_http_retry_delay_ms_value, resolve_http_retry_limit, should_retry_http_error_value,
};
use crate::DEFAULT_PROVIDER_TIMEOUT_MS;
use serde_json::{json, Map, Value};
use std::thread;
use std::time::Duration;

pub fn execute_transport_request(payload: &Value) -> Option<Value> {
    let record = payload.as_object()?;
    let request_plan = record.get("request_plan").and_then(Value::as_object)?;
    let method =
        read_trimmed_string(request_plan, &["method"]).unwrap_or_else(|| "POST".to_string());
    let target_url = read_trimmed_string(request_plan, &["target_url"])?;
    let headers = request_plan
        .get("headers")
        .and_then(Value::as_object)
        .cloned()
        .unwrap_or_default();
    let body = request_plan.get("body").cloned().unwrap_or(Value::Null);
    let timeout_ms =
        read_timeout_ms(request_plan.get("timeout_ms")).unwrap_or(DEFAULT_PROVIDER_TIMEOUT_MS);
    let body_text = serde_json::to_string(&body).ok()?;
    let max_attempts = resolve_http_retry_limit(payload);

    let mut attempt = 1_i64;
    loop {
        match execute_once(&method, &target_url, &headers, &body_text, timeout_ms) {
            Ok(result) => {
                return Some(json!({
                    "ok": true,
                    "status": result.status,
                    "headers": Value::Object(result.headers),
                    "body": result.body,
                    "attempts": attempt,
                }));
            }
            Err(mut error) => {
                let retryable = should_retry_http_error_value(
                    &Value::Object(error.clone()),
                    attempt,
                    max_attempts,
                );
                error.insert("retryable".to_string(), Value::Bool(retryable));
                if retryable {
                    let delay_ms = resolve_http_retry_delay_ms_value(attempt) as u64;
                    thread::sleep(Duration::from_millis(delay_ms));
                    attempt += 1;
                    continue;
                }

                return Some(json!({
                    "ok": false,
                    "error": Value::Object(error),
                    "attempts": attempt,
                }));
            }
        }
    }
}

struct ExecuteSuccess {
    status: u16,
    headers: Map<String, Value>,
    body: Value,
}

fn execute_once(
    method: &str,
    target_url: &str,
    headers: &Map<String, Value>,
    body_text: &str,
    timeout_ms: i64,
) -> Result<ExecuteSuccess, Map<String, Value>> {
    let agent = ureq::AgentBuilder::new()
        .timeout(Duration::from_millis(timeout_ms.max(1) as u64))
        .build();
    let mut request = agent.request(method, target_url);
    for (key, value) in headers {
        if let Some(text) = value.as_str() {
            request = request.set(key, text);
        }
    }

    match request.send_string(body_text) {
        Ok(response) => Ok(read_success_response(response)),
        Err(ureq::Error::Status(status, response)) => Err(normalize_status_error(status, response)),
        Err(ureq::Error::Transport(transport)) => {
            Err(normalize_transport_error(&transport.to_string()))
        }
    }
}

fn read_success_response(response: ureq::Response) -> ExecuteSuccess {
    let status = response.status();
    let headers = read_response_headers(&response);
    let body_text = response.into_string().unwrap_or_default();
    ExecuteSuccess {
        status,
        headers,
        body: parse_json_or_string(body_text),
    }
}

fn normalize_status_error(status: u16, response: ureq::Response) -> Map<String, Value> {
    let body_text = response.into_string().unwrap_or_default();
    let body_value = parse_json_or_string(body_text.clone());
    let message = extract_error_message(&body_value, &body_text)
        .unwrap_or_else(|| default_http_status_message(status).to_string());

    let mut error = Map::new();
    error.insert("kind".to_string(), Value::String("http_status".to_string()));
    error.insert("status".to_string(), json!(status));
    error.insert("code".to_string(), Value::String(format!("HTTP_{status}")));
    error.insert("message".to_string(), Value::String(message));
    error
}

fn normalize_transport_error(message: &str) -> Map<String, Value> {
    let lower = message.to_ascii_lowercase();
    let kind = if lower.contains("timed out") || lower.contains("timeout") {
        "timeout"
    } else {
        "transport"
    };
    let code = if kind == "timeout" {
        "TIMEOUT"
    } else {
        "TRANSPORT_ERROR"
    };

    let mut error = Map::new();
    error.insert("kind".to_string(), Value::String(kind.to_string()));
    error.insert("code".to_string(), Value::String(code.to_string()));
    error.insert("message".to_string(), Value::String(message.to_string()));
    error
}

fn read_response_headers(response: &ureq::Response) -> Map<String, Value> {
    let mut headers = Map::new();
    for name in response.headers_names() {
        if let Some(value) = response.header(&name) {
            headers.insert(name, Value::String(value.to_string()));
        }
    }
    headers
}

fn parse_json_or_string(body_text: String) -> Value {
    if body_text.trim().is_empty() {
        Value::Null
    } else {
        serde_json::from_str(&body_text).unwrap_or(Value::String(body_text))
    }
}

fn extract_error_message(body: &Value, fallback: &str) -> Option<String> {
    [
        body.pointer("/error/message").and_then(Value::as_str),
        body.get("message").and_then(Value::as_str),
        body.as_str(),
    ]
    .into_iter()
    .flatten()
    .map(str::trim)
    .find(|value| !value.is_empty())
    .map(ToOwned::to_owned)
    .or_else(|| {
        let trimmed = fallback.trim();
        (!trimmed.is_empty()).then(|| trimmed.to_string())
    })
}

fn default_http_status_message(status: u16) -> &'static str {
    match status {
        500 => "internal server error",
        502 => "bad gateway",
        503 => "service unavailable",
        504 => "gateway timeout",
        _ => "http error",
    }
}

fn read_trimmed_string(record: &Map<String, Value>, keys: &[&str]) -> Option<String> {
    keys.iter()
        .filter_map(|key| record.get(*key).and_then(Value::as_str))
        .map(str::trim)
        .find(|value| !value.is_empty())
        .map(ToOwned::to_owned)
}

fn read_timeout_ms(value: Option<&Value>) -> Option<i64> {
    match value? {
        Value::Number(number) => number.as_f64(),
        _ => None,
    }
    .filter(|value| value.is_finite())
    .map(|value| value.floor().max(0.0) as i64)
}

#[cfg(test)]
mod tests {
    use super::execute_transport_request;
    use serde_json::json;
    use std::io::{Read, Write};
    use std::net::{Shutdown, TcpListener};
    use std::thread;
    use std::time::Duration;

    struct TestServer {
        url: String,
        handle: thread::JoinHandle<()>,
    }

    impl TestServer {
        fn join(self) {
            self.handle.join().expect("test server join");
        }
    }

    #[test]
    fn execute_transport_request_returns_success_body_and_attempts() {
        let server = spawn_server(vec![ServerAction::Raw(json_response(
            200,
            "OK",
            "{\"id\":\"resp_1\",\"ok\":true}",
        ))]);

        let result = execute_transport_request(&json!({
            "request_plan": {
                "method": "POST",
                "target_url": format!("{}/chat/completions", server.url),
                "headers": {
                    "Content-Type": "application/json"
                },
                "body": {
                    "model": "gpt-5"
                },
                "timeout_ms": 200
            },
            "retry": {
                "max_attempts": 1
            }
        }))
        .expect("execute");

        assert_eq!(result["ok"], json!(true));
        assert_eq!(result["status"], json!(200));
        assert_eq!(result["body"]["id"], json!("resp_1"));
        assert_eq!(result["attempts"], json!(1));
        server.join();
    }

    #[test]
    fn execute_transport_request_does_not_retry_when_max_attempts_is_one() {
        let server = spawn_server(vec![ServerAction::Raw(json_response(
            502,
            "Bad Gateway",
            "{\"error\":{\"message\":\"bad gateway\"}}",
        ))]);

        let result = execute_transport_request(&json!({
            "request_plan": {
                "method": "POST",
                "target_url": format!("{}/chat/completions", server.url),
                "headers": {
                    "Content-Type": "application/json"
                },
                "body": {
                    "model": "gpt-5"
                },
                "timeout_ms": 200
            },
            "retry": {
                "max_attempts": 1
            }
        }))
        .expect("execute");

        assert_eq!(result["ok"], json!(false));
        assert_eq!(result["error"]["kind"], json!("http_status"));
        assert_eq!(result["error"]["status"], json!(502));
        assert_eq!(result["error"]["retryable"], json!(false));
        assert_eq!(result["attempts"], json!(1));
        server.join();
    }

    #[test]
    fn execute_transport_request_retries_5xx_when_additional_attempts_are_allowed() {
        let server = spawn_server(vec![
            ServerAction::Raw(json_response(
                502,
                "Bad Gateway",
                "{\"error\":{\"message\":\"bad gateway\"}}",
            )),
            ServerAction::Raw(json_response(200, "OK", "{\"ok\":true}")),
        ]);

        let result = execute_transport_request(&json!({
            "request_plan": {
                "method": "POST",
                "target_url": format!("{}/chat/completions", server.url),
                "headers": {
                    "Content-Type": "application/json"
                },
                "body": {
                    "model": "gpt-5"
                },
                "timeout_ms": 200
            },
            "retry": {
                "max_attempts": 2
            }
        }))
        .expect("execute");

        assert_eq!(result["ok"], json!(true));
        assert_eq!(result["attempts"], json!(2));
        assert_eq!(result["body"]["ok"], json!(true));
        server.join();
    }

    #[test]
    fn execute_transport_request_normalizes_transport_errors() {
        let listener = TcpListener::bind("127.0.0.1:0").expect("bind");
        let addr = listener.local_addr().expect("addr");
        drop(listener);

        let result = execute_transport_request(&json!({
            "request_plan": {
                "method": "POST",
                "target_url": format!("http://{}/chat/completions", addr),
                "headers": {
                    "Content-Type": "application/json"
                },
                "body": {
                    "model": "gpt-5"
                },
                "timeout_ms": 100
            }
        }))
        .expect("execute");

        assert_eq!(result["ok"], json!(false));
        assert_eq!(result["error"]["kind"], json!("transport"));
        assert_eq!(result["error"]["code"], json!("TRANSPORT_ERROR"));
    }

    #[test]
    fn execute_transport_request_normalizes_timeout_errors() {
        let server = spawn_server(vec![ServerAction::SleepThenRaw {
            sleep_ms: 200,
            response: json_response(200, "OK", "{\"ok\":true}"),
        }]);

        let result = execute_transport_request(&json!({
            "request_plan": {
                "method": "POST",
                "target_url": format!("{}/chat/completions", server.url),
                "headers": {
                    "Content-Type": "application/json"
                },
                "body": {
                    "model": "gpt-5"
                },
                "timeout_ms": 20
            }
        }))
        .expect("execute");

        assert_eq!(result["ok"], json!(false));
        assert_eq!(result["error"]["kind"], json!("timeout"));
        assert_eq!(result["error"]["code"], json!("TIMEOUT"));
        server.join();
    }

    enum ServerAction {
        Raw(String),
        SleepThenRaw { sleep_ms: u64, response: String },
    }

    fn spawn_server(actions: Vec<ServerAction>) -> TestServer {
        let listener = TcpListener::bind("127.0.0.1:0").expect("bind");
        let addr = listener.local_addr().expect("addr");
        let handle = thread::spawn(move || {
            for action in actions {
                let (mut stream, _) = listener.accept().expect("accept");
                stream
                    .set_read_timeout(Some(Duration::from_millis(1_500)))
                    .expect("set timeout");
                let _ = drain_request(&mut stream);
                match action {
                    ServerAction::Raw(response) => {
                        let _ = stream.write_all(response.as_bytes());
                    }
                    ServerAction::SleepThenRaw { sleep_ms, response } => {
                        thread::sleep(Duration::from_millis(sleep_ms));
                        let _ = stream.write_all(response.as_bytes());
                    }
                }
                let _ = stream.flush();
                let _ = stream.shutdown(Shutdown::Both);
            }
        });

        TestServer {
            url: format!("http://{}", addr),
            handle,
        }
    }

    fn drain_request(stream: &mut std::net::TcpStream) -> Vec<u8> {
        let mut buffer = [0_u8; 4096];
        let mut request = Vec::new();
        loop {
            match stream.read(&mut buffer) {
                Ok(0) => break,
                Ok(read) => {
                    request.extend_from_slice(&buffer[..read]);
                    if request.windows(4).any(|window| window == b"\r\n\r\n") {
                        break;
                    }
                }
                Err(_) => break,
            }
        }
        request
    }

    fn json_response(status: u16, status_text: &str, body: &str) -> String {
        format!(
            "HTTP/1.1 {status} {status_text}\r\nContent-Type: application/json\r\nContent-Length: {}\r\n\r\n{body}",
            body.len()
        )
    }
}
