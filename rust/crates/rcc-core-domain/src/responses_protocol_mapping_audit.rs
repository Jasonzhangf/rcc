use serde_json::Value;

use crate::{ProtocolAuditDisposition, ProtocolMappingAudit, ProtocolMappingAuditEntry};

pub const RESPONSES_SOURCE_PROTOCOL: &str = "openai-responses";
pub const TARGET_PROTOCOL_ANTHROPIC: &str = "anthropic-messages";
pub const TARGET_PROTOCOL_GEMINI: &str = "gemini-chat";

const DROPPED_NO_EQUIVALENT_FIELDS: &[&str] = &[
    "prompt_cache_key",
    "parallel_tool_calls",
    "service_tier",
    "truncation",
    "include",
    "store",
];

pub fn build_responses_cross_protocol_audit(
    request_payload: &Value,
    target_protocol: &str,
) -> ProtocolMappingAudit {
    let mut audit = ProtocolMappingAudit::default();
    let Some(record) = request_payload.as_object() else {
        return audit;
    };

    for field in DROPPED_NO_EQUIVALENT_FIELDS {
        if has_non_null_field(record.get(*field)) {
            audit.append(protocol_audit_entry(
                field,
                ProtocolAuditDisposition::Dropped,
                "unsupported_semantics_no_equivalent",
                target_protocol,
            ));
        }
    }

    if has_non_null_field(record.get("reasoning")) {
        audit.append(protocol_audit_entry(
            "reasoning",
            ProtocolAuditDisposition::Lossy,
            "provider_reasoning_semantics_differ",
            target_protocol,
        ));
    }

    if has_non_null_field(record.get("response_format")) {
        audit.append(protocol_audit_entry(
            "response_format",
            ProtocolAuditDisposition::Unsupported,
            "structured_output_not_supported",
            target_protocol,
        ));
    }

    if has_non_null_field(record.get("tool_choice")) {
        audit.append(protocol_audit_entry(
            "tool_choice",
            ProtocolAuditDisposition::Preserved,
            preserved_tool_choice_reason(target_protocol),
            target_protocol,
        ));
    }

    audit
}

fn has_non_null_field(value: Option<&Value>) -> bool {
    value.is_some_and(|value| !value.is_null())
}

fn protocol_audit_entry(
    field: &str,
    disposition: ProtocolAuditDisposition,
    reason: &str,
    target_protocol: &str,
) -> ProtocolMappingAuditEntry {
    ProtocolMappingAuditEntry {
        field: field.to_string(),
        disposition,
        reason: reason.to_string(),
        source_protocol: Some(RESPONSES_SOURCE_PROTOCOL.to_string()),
        target_protocol: Some(target_protocol.to_string()),
    }
}

fn preserved_tool_choice_reason(target_protocol: &str) -> &'static str {
    match target_protocol {
        TARGET_PROTOCOL_ANTHROPIC => "preserved_verbatim_top_level",
        TARGET_PROTOCOL_GEMINI => "preserved_via_metadata_passthrough",
        _ => "preserved_via_protocol_projection",
    }
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeSet;

    use serde_json::json;

    use crate::ProtocolAuditDisposition;

    use super::{
        build_responses_cross_protocol_audit, TARGET_PROTOCOL_ANTHROPIC, TARGET_PROTOCOL_GEMINI,
    };

    fn field_set(
        audit: &crate::ProtocolMappingAudit,
        disposition: ProtocolAuditDisposition,
    ) -> BTreeSet<String> {
        let bucket = match disposition {
            ProtocolAuditDisposition::Preserved => &audit.preserved,
            ProtocolAuditDisposition::Lossy => &audit.lossy,
            ProtocolAuditDisposition::Dropped => &audit.dropped,
            ProtocolAuditDisposition::Unsupported => &audit.unsupported,
        };
        bucket.iter().map(|entry| entry.field.clone()).collect()
    }

    #[test]
    fn responses_cross_protocol_audit_records_anthropic_matrix_fields() {
        let audit = build_responses_cross_protocol_audit(
            &json!({
                "prompt_cache_key": "cache-key-101",
                "response_format": {"type":"json_object"},
                "parallel_tool_calls": true,
                "service_tier": "default",
                "truncation": "disabled",
                "include": ["output_text"],
                "store": true,
                "reasoning": {"effort":"medium"},
                "tool_choice": "required"
            }),
            TARGET_PROTOCOL_ANTHROPIC,
        );

        let dropped = field_set(&audit, ProtocolAuditDisposition::Dropped);
        for field in [
            "prompt_cache_key",
            "parallel_tool_calls",
            "service_tier",
            "truncation",
            "include",
            "store",
        ] {
            assert!(dropped.contains(field));
        }
        assert!(field_set(&audit, ProtocolAuditDisposition::Lossy).contains("reasoning"));
        assert!(
            field_set(&audit, ProtocolAuditDisposition::Unsupported).contains("response_format")
        );
        assert!(field_set(&audit, ProtocolAuditDisposition::Preserved).contains("tool_choice"));
        assert_eq!(audit.preserved[0].reason, "preserved_verbatim_top_level");
        assert_eq!(
            audit.preserved[0].source_protocol.as_deref(),
            Some("openai-responses")
        );
        assert_eq!(
            audit.preserved[0].target_protocol.as_deref(),
            Some("anthropic-messages")
        );
    }

    #[test]
    fn responses_cross_protocol_audit_records_gemini_tool_choice_reason() {
        let audit = build_responses_cross_protocol_audit(
            &json!({
                "tool_choice": "required",
                "response_format": {"type":"json_schema"},
                "reasoning": {"effort":"high"}
            }),
            TARGET_PROTOCOL_GEMINI,
        );

        assert_eq!(
            audit.preserved[0].reason,
            "preserved_via_metadata_passthrough"
        );
        assert_eq!(
            audit.unsupported[0].reason,
            "structured_output_not_supported"
        );
        assert_eq!(audit.lossy[0].reason, "provider_reasoning_semantics_differ");
        assert_eq!(
            audit.preserved[0].target_protocol.as_deref(),
            Some("gemini-chat")
        );
    }
}
