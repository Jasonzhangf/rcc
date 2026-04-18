mod auth_apikey;
mod transport_request_plan;

pub use auth_apikey::build_apikey_headers;
use rcc_core_domain::{ProviderRuntime, RequestEnvelope, RouteDecision};
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
