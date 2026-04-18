use rcc_core_domain::RequestEnvelope;

#[derive(Debug, Default)]
pub struct PipelineBlock;

impl PipelineBlock {
    pub fn prepare(&self, request: RequestEnvelope) -> RequestEnvelope {
        let operation = request.operation.trim();
        let payload = request.payload.trim();
        RequestEnvelope::new(
            if operation.is_empty() {
                "smoke"
            } else {
                operation
            },
            if payload.is_empty() {
                "phase2"
            } else {
                payload
            },
        )
    }
}
