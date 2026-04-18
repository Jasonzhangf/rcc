mod auth_apikey;
mod http_execute;
mod http_retry;
mod request_preprocessor;
mod runtime_metadata;
mod sse_transport;
mod transport_request_plan;

pub use auth_apikey::build_apikey_headers;
pub use http_execute::execute_transport_request;
pub use http_retry::{
    get_http_retry_limit, resolve_http_retry_delay_ms, should_retry_http_error,
    DEFAULT_HTTP_MAX_ATTEMPTS,
};
use rcc_core_domain::{ProviderRuntime, RequestEnvelope, RouteDecision};
pub use request_preprocessor::preprocess_provider_request;
pub use runtime_metadata::{
    attach_provider_runtime_metadata, extract_client_request_id, extract_entry_endpoint,
    extract_provider_runtime_metadata, normalize_client_headers, PROVIDER_RUNTIME_METADATA_KEY,
};
pub use sse_transport::{
    execute_sse_transport_request, prepare_sse_request_body, resolve_wants_upstream_sse,
    wrap_upstream_sse_response,
};
pub use transport_request_plan::{
    build_transport_request_plan, resolve_effective_base_url, resolve_effective_endpoint,
    DEFAULT_PROVIDER_TIMEOUT_MS,
};

#[derive(Debug, Default)]
pub struct NoopProviderRuntime;

impl ProviderRuntime for NoopProviderRuntime {
    fn runtime_name(&self) -> &'static str {
        "noop-runtime"
    }

    fn execute(&self, request: &RequestEnvelope, route: &RouteDecision) -> String {
        format!(
            "runtime={} operation={} route={} payload={}",
            self.runtime_name(),
            request.operation,
            route.target_block,
            request.payload
        )
    }
}
