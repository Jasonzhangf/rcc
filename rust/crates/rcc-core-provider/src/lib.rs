use rcc_core_domain::{ProviderRuntime, RequestEnvelope, RouteDecision};

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
