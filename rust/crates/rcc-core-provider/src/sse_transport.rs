use serde_json::{json, Map, Value};
use std::io::Read;
use std::time::Duration;

pub fn resolve_wants_upstream_sse(payload: &Value) -> Option<Value> {
    Some(json!({
        "wants_sse": resolve_wants_upstream_sse_flag(payload)
    }))
}

pub fn prepare_sse_request_body(payload: &Value) -> Option<Value> {
    let record = payload.as_object()?;
    let body = record.get("body").and_then(Value::as_object)?.clone();
    let wants_sse = resolve_wants_upstream_sse_flag(payload);
    let mut prepared = body.clone();
    if wants_sse {
        prepared.insert("stream".to_string(), Value::Bool(true));
    }
    Some(json!({
        "body": Value::Object(prepared)
    }))
}

pub fn wrap_upstream_sse_response(payload: &Value) -> Option<Value> {
    let record = payload.as_object()?;
    let status = record.get("status").cloned().unwrap_or(json!(200));
    let headers = record
        .get("headers")
        .and_then(Value::as_object)
        .cloned()
        .unwrap_or_default();
    let body = record.get("body")?.clone();
    let content_type = headers
        .iter()
        .find(|(key, _)| key.eq_ignore_ascii_case("content-type"))
        .and_then(|(_, value)| value.as_str())
        .unwrap_or("text/event-stream")
        .to_string();

    Some(json!({
        "__sse_responses": {
            "status": status,
            "headers": Value::Object(headers),
            "content_type": content_type,
            "body": body,
        }
    }))
}

pub fn execute_sse_transport_request(payload: &Value) -> Option<Value> {
    let record = payload.as_object()?;
    let request_plan = record.get("request_plan").and_then(Value::as_object)?;
    let wants_sse = resolve_wants_upstream_sse_flag(payload);
    if !wants_sse {
        return None;
    }

    let method =
        read_trimmed_string(request_plan, &["method"]).unwrap_or_else(|| "POST".to_string());
    let target_url = read_trimmed_string(request_plan, &["target_url"])?;
    let timeout_ms = request_plan
        .get("timeout_ms")
        .and_then(read_timeout_ms)
        .unwrap_or(60_000);
    let request_body = request_plan.get("body").cloned().unwrap_or(Value::Null);
    let prepared = prepare_sse_request_body(&json!({
        "request": record.get("request").cloned().unwrap_or(Value::Null),
        "wants_sse": wants_sse,
        "body": request_body,
    }))?;
    let final_body = prepared.get("body")?;
    let body_text = serde_json::to_string(final_body).ok()?;
    let mut headers = request_plan
        .get("headers")
        .and_then(Value::as_object)
        .cloned()
        .unwrap_or_default();
    headers.insert(
        "Accept".to_string(),
        Value::String("text/event-stream".to_string()),
    );

    let agent = ureq::AgentBuilder::new()
        .timeout(Duration::from_millis(timeout_ms.max(1) as u64))
        .build();
    let mut request = agent.request(&method, &target_url);
    for (key, value) in &headers {
        if let Some(text) = value.as_str() {
            request = request.set(key, text);
        }
    }

    match request.send_string(&body_text) {
        Ok(response) => {
            let status = response.status();
            let response_headers = read_response_headers(&response);
            let body = read_response_body(response);
            let wrapped = wrap_upstream_sse_response(&json!({
                "status": status,
                "headers": Value::Object(response_headers),
                "body": body,
            }))?;
            Some(json!({
                "ok": true,
                "__sse_responses": wrapped.get("__sse_responses")?.clone(),
                "attempts": 1
            }))
        }
        Err(ureq::Error::Status(status, response)) => {
            let body = response.into_string().unwrap_or_default();
            Some(json!({
                "ok": false,
                "error": {
                    "kind": "http_status",
                    "status": status,
                    "code": format!("HTTP_{status}"),
                    "message": body
                },
                "attempts": 1
            }))
        }
        Err(ureq::Error::Transport(error)) => Some(json!({
            "ok": false,
            "error": {
                "kind": "transport",
                "code": "TRANSPORT_ERROR",
                "message": error.to_string()
            },
            "attempts": 1
        })),
    }
}

fn read_response_body(response: ureq::Response) -> String {
    let mut reader = response.into_reader();
    let mut body = String::new();
    let _ = reader.read_to_string(&mut body);
    body
}

fn resolve_wants_upstream_sse_flag(payload: &Value) -> bool {
    payload
        .get("wants_sse")
        .and_then(Value::as_bool)
        .or_else(|| {
            payload
                .get("request")
                .and_then(Value::as_object)
                .and_then(resolve_stream_flag_from_request)
        })
        .unwrap_or(false)
}

fn resolve_stream_flag_from_request(request: &Map<String, Value>) -> Option<bool> {
    request
        .get("metadata")
        .and_then(Value::as_object)
        .and_then(|metadata| metadata.get("stream"))
        .and_then(Value::as_bool)
        .or_else(|| request.get("stream").and_then(Value::as_bool))
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

fn read_trimmed_string(record: &Map<String, Value>, keys: &[&str]) -> Option<String> {
    keys.iter()
        .filter_map(|key| record.get(*key).and_then(Value::as_str))
        .map(str::trim)
        .find(|value| !value.is_empty())
        .map(ToOwned::to_owned)
}

fn read_timeout_ms(value: &Value) -> Option<i64> {
    match value {
        Value::Number(number) => number.as_f64(),
        _ => None,
    }
    .filter(|value| value.is_finite())
    .map(|value| value.floor().max(0.0) as i64)
}

#[cfg(test)]
mod tests {
    use super::{
        execute_sse_transport_request, prepare_sse_request_body, resolve_wants_upstream_sse,
        wrap_upstream_sse_response,
    };
    use serde_json::json;
    use std::io::{Read, Write};
    use std::net::{Shutdown, TcpListener};
    use std::thread;
    use std::time::Duration;

    #[test]
    fn resolve_wants_upstream_sse_reads_request_stream_flag() {
        let result = resolve_wants_upstream_sse(&json!({
            "request": {
                "metadata": {
                    "stream": true
                }
            }
        }))
        .expect("wants sse");

        assert_eq!(result, json!({ "wants_sse": true }));
    }

    #[test]
    fn prepare_sse_request_body_sets_stream_true() {
        let result = prepare_sse_request_body(&json!({
            "wants_sse": true,
            "body": {
                "model": "gpt-5"
            }
        }))
        .expect("body");

        assert_eq!(
            result,
            json!({ "body": { "model": "gpt-5", "stream": true } })
        );
    }

    #[test]
    fn wrap_upstream_sse_response_builds_raw_carrier() {
        let result = wrap_upstream_sse_response(&json!({
            "status": 200,
            "headers": {
                "content-type": "text/event-stream"
            },
            "body": "event: message\\ndata: {\\\"ok\\\":true}\\n\\n"
        }))
        .expect("wrap");

        assert_eq!(
            result["__sse_responses"]["content_type"],
            json!("text/event-stream")
        );
        assert_eq!(result["__sse_responses"]["status"], json!(200));
    }

    #[test]
    fn execute_sse_transport_request_reads_text_event_stream() {
        let listener = TcpListener::bind("127.0.0.1:0").expect("bind");
        let addr = listener.local_addr().expect("addr");
        let handle = thread::spawn(move || {
            let (mut stream, _) = listener.accept().expect("accept");
            stream
                .set_read_timeout(Some(Duration::from_millis(500)))
                .expect("timeout");
            let mut buffer = [0_u8; 4096];
            let _ = stream.read(&mut buffer);
            let body = "event: message\ndata: {\"ok\":true}\n\n";
            let response = format!(
                "HTTP/1.1 200 OK\r\nContent-Type: text/event-stream\r\nContent-Length: {}\r\n\r\n{body}",
                body.len()
            );
            let _ = stream.write_all(response.as_bytes());
            let _ = stream.flush();
            let _ = stream.shutdown(Shutdown::Both);
        });

        let result = execute_sse_transport_request(&json!({
            "request": {
                "stream": true
            },
            "request_plan": {
                "method": "POST",
                "target_url": format!("http://{}/v1/responses", addr),
                "headers": {
                    "Content-Type": "application/json"
                },
                "body": {
                    "model": "gpt-5",
                    "input": "hello"
                },
                "timeout_ms": 200
            }
        }))
        .expect("execute");

        assert_eq!(result["ok"], json!(true));
        assert_eq!(
            result["__sse_responses"]["content_type"],
            json!("text/event-stream")
        );
        assert_eq!(
            result["__sse_responses"]["body"],
            json!("event: message\ndata: {\"ok\":true}\n\n")
        );
        handle.join().expect("join");
    }
}
