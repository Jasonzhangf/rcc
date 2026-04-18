use rcc_core_domain::RequestEnvelope;
use rcc_core_orchestrator::SkeletonApplication;

pub fn run() -> String {
    let app = SkeletonApplication::new();
    let response = app.run_smoke(RequestEnvelope::new("smoke", "phase2"));
    format!(
        "host=thin runtime={} route={} tools={} payload={}",
        response.provider_runtime,
        response.route.target_block,
        response.tool_plan.scheduled.len(),
        response.payload
    )
}
