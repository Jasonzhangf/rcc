use rcc_core_config::{load_config, EffectiveConfig};
use rcc_core_domain::{
    build_responses_request_envelope, serialize_responses_shell, RequestEnvelope,
};
use rcc_core_orchestrator::SkeletonApplication;
use serde_json::{json, Value};
use std::error::Error;
use std::fmt::{self, Display, Formatter};
use tiny_http::{Header, Method, Response, Server, StatusCode};

#[derive(Debug, Clone)]
pub struct HostError {
    message: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
enum HostCommand {
    Smoke,
    Serve { addr_override: Option<String> },
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct HostCliArgs {
    config_path: Option<String>,
    command: HostCommand,
}

impl HostError {
    fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
        }
    }
}

impl Display for HostError {
    fn fmt(&self, f: &mut Formatter<'_>) -> fmt::Result {
        f.write_str(&self.message)
    }
}

impl Error for HostError {}

pub fn run_from_env() -> Result<(), HostError> {
    let cli = parse_cli_args(std::env::args().skip(1))?;
    let loaded = load_host_config(cli.config_path.as_deref())?;

    match cli.command {
        HostCommand::Smoke => {
            println!("{}", smoke_summary_with_config(&loaded.effective));
            Ok(())
        }
        HostCommand::Serve { addr_override } => {
            let addr = addr_override.unwrap_or_else(|| loaded.effective.host.server.addr.clone());
            serve_at_with_config(&addr, &loaded.effective)
        }
    }
}

pub fn smoke_summary() -> Result<String, HostError> {
    let loaded = load_host_config(None)?;
    Ok(smoke_summary_with_config(&loaded.effective))
}

pub fn smoke_summary_with_config(config: &EffectiveConfig) -> String {
    let app = SkeletonApplication::from_config(config);
    let response = app.handle(RequestEnvelope::new(
        &config.host.defaults.smoke.operation,
        &config.host.defaults.smoke.payload,
    ));
    format!(
        "host=thin runtime={} route={} tools={} payload={}",
        response.provider_runtime,
        response.route.target_block,
        response.tool_plan.scheduled.len(),
        response.payload
    )
}

pub fn serve_at(addr: &str) -> Result<(), HostError> {
    let loaded = load_host_config(None)?;
    serve_at_with_config(addr, &loaded.effective)
}

pub fn serve_at_with_config(addr: &str, config: &EffectiveConfig) -> Result<(), HostError> {
    let server = Server::http(addr)
        .map_err(|error| HostError::new(format!("failed to bind {addr}: {error}")))?;
    let app = SkeletonApplication::from_config(config);

    for request in server.incoming_requests() {
        if let Err(error) = handle_request(request, &app, config) {
            return Err(error);
        }
    }

    Ok(())
}

fn load_host_config(
    explicit_config_path: Option<&str>,
) -> Result<rcc_core_config::LoadedConfig, HostError> {
    load_config(explicit_config_path)
        .map_err(|error| HostError::new(format!("failed to load config: {error}")))
}

fn parse_cli_args<I>(args: I) -> Result<HostCliArgs, HostError>
where
    I: Iterator<Item = String>,
{
    let mut filtered_args = Vec::new();
    let mut config_path = None;
    let mut args = args.peekable();

    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--config" => {
                let value = args.next().ok_or_else(|| {
                    HostError::new("missing value for `--config` when starting host")
                })?;
                config_path = Some(value);
            }
            value if value.starts_with("--config=") => {
                config_path = Some(value["--config=".len()..].to_string());
            }
            other => filtered_args.push(other.to_string()),
        }
    }

    match filtered_args.first().map(String::as_str) {
        None | Some("smoke") => {
            if filtered_args.len() > 1 {
                return Err(HostError::new(format!(
                    "unsupported smoke arguments: {}",
                    filtered_args[1..].join(" ")
                )));
            }
            Ok(HostCliArgs {
                config_path,
                command: HostCommand::Smoke,
            })
        }
        Some("serve") => Ok(HostCliArgs {
            config_path,
            command: HostCommand::Serve {
                addr_override: parse_serve_addr(filtered_args.into_iter().skip(1))?,
            },
        }),
        Some(command) => Err(HostError::new(format!(
            "unsupported command: {command}. expected `smoke` or `serve`"
        ))),
    }
}

fn parse_serve_addr<I>(mut args: I) -> Result<Option<String>, HostError>
where
    I: Iterator<Item = String>,
{
    let mut addr = None;

    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--addr" => {
                let value = args.next().ok_or_else(|| {
                    HostError::new("missing value for `--addr` when starting host server")
                })?;
                addr = Some(value);
            }
            value if addr.is_none() && !value.starts_with("--") => {
                addr = Some(value.to_string());
            }
            other => {
                return Err(HostError::new(format!(
                    "unsupported serve argument: {other}. expected `--addr <host:port>`"
                )));
            }
        }
    }

    Ok(addr)
}

fn handle_request(
    mut request: tiny_http::Request,
    app: &SkeletonApplication,
    config: &EffectiveConfig,
) -> Result<(), HostError> {
    let method = request.method().clone();
    let url = request.url().to_string();

    let response = match (method, url.as_str()) {
        (Method::Get, "/healthz") => json_response(
            json!({
                "status": "ok",
                "service": config.host.service_name,
                "mode": "serve"
            }),
            200,
        ),
        (Method::Post, "/smoke") => {
            let body = read_request_body(&mut request)?;
            response_for_body(
                app,
                &body,
                &config.host.defaults.smoke.operation,
                &config.host.defaults.smoke.payload,
            )
        }
        (Method::Post, "/requests") => {
            let body = read_request_body(&mut request)?;
            response_for_body(app, &body, "", "")
        }
        (Method::Post, "/chat") => {
            let body = read_request_body(&mut request)?;
            response_for_chat_body(app, &body, &config.host.defaults.chat.operation)
        }
        (Method::Post, "/v1/responses") => {
            let body = read_request_body(&mut request)?;
            response_for_responses_body(app, &body)
        }
        _ => json_response(
            json!({
                "ok": false,
                "error": format!("unsupported route: {url}")
            }),
            404,
        ),
    };

    request
        .respond(response)
        .map_err(|error| HostError::new(format!("failed to respond to {url}: {error}")))?;
    Ok(())
}

fn read_request_body(request: &mut tiny_http::Request) -> Result<String, HostError> {
    let mut body = String::new();
    request
        .as_reader()
        .read_to_string(&mut body)
        .map_err(|error| HostError::new(format!("failed to read request body: {error}")))?;
    Ok(body)
}

fn response_for_body(
    app: &SkeletonApplication,
    body: &str,
    default_operation: &str,
    default_payload: &str,
) -> Response<std::io::Cursor<Vec<u8>>> {
    match parse_request_envelope(body, default_operation, default_payload) {
        Ok(request_envelope) => {
            let response = app.handle(request_envelope.clone());
            json_response(
                json!({
                    "ok": true,
                    "request": {
                        "operation": request_envelope.operation,
                        "payload": parse_jsonish_payload(body, default_operation, default_payload)
                    },
                    "response": {
                        "route": {
                            "target_block": response.route.target_block,
                            "selected_route": response.route.selected_route,
                            "selected_target": response.route.selected_target,
                            "candidate_routes": response.route.candidate_routes,
                        },
                        "tool_plan": {
                            "scheduled": response.tool_plan.scheduled,
                        },
                        "provider_runtime": response.provider_runtime,
                        "payload": response.payload,
                    }
                }),
                200,
            )
        }
        Err(error) => json_response(
            json!({
                "ok": false,
                "error": error.to_string(),
            }),
            400,
        ),
    }
}

fn response_for_chat_body(
    app: &SkeletonApplication,
    body: &str,
    default_chat_operation: &str,
) -> Response<std::io::Cursor<Vec<u8>>> {
    match parse_chat_request(body, default_chat_operation) {
        Ok((request_envelope, payload_value)) => {
            let response = app.handle(request_envelope.clone());
            json_response(
                json!({
                    "ok": true,
                    "request": {
                        "operation": request_envelope.operation,
                        "payload": payload_value,
                    },
                    "response": {
                        "route": {
                            "target_block": response.route.target_block,
                            "selected_route": response.route.selected_route,
                            "selected_target": response.route.selected_target,
                            "candidate_routes": response.route.candidate_routes,
                        },
                        "tool_plan": {
                            "scheduled": response.tool_plan.scheduled,
                        },
                        "provider_runtime": response.provider_runtime,
                        "payload": response.payload,
                    }
                }),
                200,
            )
        }
        Err(error) => json_response(
            json!({
                "ok": false,
                "error": error.to_string(),
            }),
            400,
        ),
    }
}

fn response_for_responses_body(
    app: &SkeletonApplication,
    body: &str,
) -> Response<std::io::Cursor<Vec<u8>>> {
    match build_responses_request_envelope(body) {
        Ok((request_envelope, payload_value)) => {
            let response = app.handle(request_envelope);
            json_response(serialize_responses_shell(&payload_value, &response), 200)
        }
        Err(error) => json_response(
            json!({
                "ok": false,
                "error": error.to_string(),
            }),
            400,
        ),
    }
}

fn parse_request_envelope(
    body: &str,
    default_operation: &str,
    default_payload: &str,
) -> Result<RequestEnvelope, HostError> {
    if body.trim().is_empty() {
        return Ok(RequestEnvelope::new(default_operation, default_payload));
    }

    let value: Value = serde_json::from_str(body)
        .map_err(|error| HostError::new(format!("invalid JSON body: {error}")))?;
    let operation = value
        .get("operation")
        .and_then(Value::as_str)
        .unwrap_or(default_operation);
    let payload = value
        .get("payload")
        .map(json_value_to_payload_string)
        .unwrap_or_else(|| default_payload.to_string());

    if operation.trim().is_empty() && default_operation.is_empty() {
        return Err(HostError::new(
            "missing required field `operation` for generic request endpoint",
        ));
    }

    Ok(RequestEnvelope::new(operation, payload))
}

fn parse_chat_request(
    body: &str,
    default_chat_operation: &str,
) -> Result<(RequestEnvelope, Value), HostError> {
    let payload_value = if body.trim().is_empty() {
        json!({})
    } else {
        serde_json::from_str::<Value>(body)
            .map_err(|error| HostError::new(format!("invalid JSON body for /chat: {error}")))?
    };

    let operation = payload_value
        .get("operation")
        .and_then(Value::as_str)
        .unwrap_or(default_chat_operation);

    if operation.trim().is_empty() {
        return Err(HostError::new(
            "missing required chat operation after normalization",
        ));
    }

    Ok((
        RequestEnvelope::new(operation, payload_value.to_string()),
        payload_value,
    ))
}

fn parse_jsonish_payload(body: &str, _default_operation: &str, default_payload: &str) -> Value {
    if body.trim().is_empty() {
        return json!(default_payload);
    }

    match serde_json::from_str::<Value>(body) {
        Ok(value) => value
            .get("payload")
            .cloned()
            .unwrap_or_else(|| json!(default_payload)),
        Err(_) => json!(default_payload),
    }
}

fn json_value_to_payload_string(value: &Value) -> String {
    match value {
        Value::String(text) => text.clone(),
        other => other.to_string(),
    }
}

fn json_response(value: Value, status: u16) -> Response<std::io::Cursor<Vec<u8>>> {
    let body = value.to_string();
    let header = Header::from_bytes("Content-Type", "application/json").expect("json header");
    Response::from_string(body)
        .with_status_code(StatusCode(status))
        .with_header(header)
}

#[cfg(test)]
mod tests {
    use super::{parse_chat_request, parse_request_envelope, smoke_summary_with_config};
    use rcc_core_config::load_config;
    use rcc_core_domain::build_responses_request_envelope;
    use serde_json::json;

    #[test]
    fn smoke_summary_contains_runtime_and_pipeline_route() {
        let config = test_config();
        let summary = smoke_summary_with_config(&config.effective);

        assert!(summary.contains("host=thin"));
        assert!(summary.contains("runtime=noop-runtime"));
        assert!(summary.contains("route=pipeline"));
        assert!(summary.contains("payload=runtime=noop-runtime"));
    }

    #[test]
    fn parse_request_envelope_defaults_when_body_is_empty() {
        let config = test_config();
        let request = parse_request_envelope(
            "",
            &config.effective.host.defaults.smoke.operation,
            &config.effective.host.defaults.smoke.payload,
        )
        .expect("smoke request");

        assert_eq!(
            request.operation,
            config.effective.host.defaults.smoke.operation
        );
        assert_eq!(
            request.payload,
            config.effective.host.defaults.smoke.payload
        );
    }

    #[test]
    fn parse_request_envelope_uses_payload_from_json() {
        let config = test_config();
        let request = parse_request_envelope(
            r#"{"operation":"smoke","payload":"phase7-batch01"}"#,
            &config.effective.host.defaults.smoke.operation,
            &config.effective.host.defaults.smoke.payload,
        )
        .expect("smoke request");

        assert_eq!(request.operation, "smoke");
        assert_eq!(request.payload, "phase7-batch01");
    }

    #[test]
    fn parse_request_envelope_serializes_object_payload() {
        let request = parse_request_envelope(
            r#"{"operation":"tool.followup","payload":{"captured":{"model":"gpt-5"}}}"#,
            "",
            "",
        )
        .expect("request envelope");

        assert_eq!(request.operation, "tool.followup");
        assert!(request.payload.contains(r#""model":"gpt-5""#));
    }

    #[test]
    fn parse_request_envelope_requires_operation_for_generic_requests() {
        let error = parse_request_envelope(r#"{"payload":"x"}"#, "", "")
            .expect_err("missing operation should fail");

        assert!(error
            .to_string()
            .contains("missing required field `operation`"));
    }

    #[test]
    fn parse_chat_request_defaults_to_chat_operation_and_whole_body_payload() {
        let config = test_config();
        let (request, payload) = parse_chat_request(
            r#"{"model":"gpt-5","messages":[{"role":"user","content":"继续执行"}]}"#,
            &config.effective.host.defaults.chat.operation,
        )
        .expect("chat request");
        let encoded_payload: serde_json::Value =
            serde_json::from_str(&request.payload).expect("encoded payload");

        assert_eq!(
            request.operation,
            config.effective.host.defaults.chat.operation
        );
        assert_eq!(payload["model"], "gpt-5");
        assert_eq!(encoded_payload["messages"][0]["role"], "user");
    }

    #[test]
    fn parse_chat_request_supports_empty_body() {
        let config = test_config();
        let (request, payload) =
            parse_chat_request("", &config.effective.host.defaults.chat.operation)
                .expect("chat request");

        assert_eq!(
            request.operation,
            config.effective.host.defaults.chat.operation
        );
        assert_eq!(payload, json!({}));
        assert_eq!(request.payload, "{}");
    }

    #[test]
    fn responses_request_defaults_to_responses_operation() {
        let (request, payload) =
            build_responses_request_envelope(r#"{"model":"gpt-5","input":"继续执行"}"#)
                .expect("responses request");

        assert_eq!(request.operation, "responses");
        assert_eq!(payload["model"], "gpt-5");
    }

    fn test_config() -> rcc_core_config::LoadedConfig {
        let path = std::env::temp_dir().join("rcc-core-host-test-missing-config.json");
        load_config(Some(path.to_str().expect("config path str"))).expect("load test config")
    }
}
