use rcc_core_domain::{RequestEnvelope, RouteDecision};

#[derive(Debug, Default)]
pub struct RouterBlock;

impl RouterBlock {
    pub fn select(&self, request: &RequestEnvelope) -> RouteDecision {
        let target_block = if request.operation.contains("tool") {
            "servertool"
        } else {
            "pipeline"
        };
        RouteDecision {
            target_block: target_block.to_string(),
        }
    }
}
