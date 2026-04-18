use rcc_core_domain::{ProviderRuntime, RequestEnvelope, ResponseEnvelope};
use rcc_core_pipeline::PipelineBlock;
use rcc_core_provider::NoopProviderRuntime;
use rcc_core_router::RouterBlock;
use rcc_core_servertool::ServertoolBlock;

#[derive(Debug, Default)]
pub struct SkeletonApplication {
    pipeline: PipelineBlock,
    router: RouterBlock,
    servertool: ServertoolBlock,
    provider: NoopProviderRuntime,
}

impl SkeletonApplication {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn run_smoke(&self, request: RequestEnvelope) -> ResponseEnvelope {
        let prepared = self.pipeline.prepare(request);
        let route = self.router.select(&prepared);
        let tool_plan = self.servertool.plan(&prepared);
        let payload = self.provider.execute(&prepared, &route);

        ResponseEnvelope {
            route,
            tool_plan,
            provider_runtime: self.provider.runtime_name(),
            payload,
        }
    }
}
