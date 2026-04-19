use serde_json::{json, Map, Value};
use std::error::Error;
use std::fmt::{self, Display, Formatter};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct JsonFieldMappingRule {
    pub source_pointer: &'static str,
    pub target_field: &'static str,
    pub required: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ProtocolAuditDisposition {
    Preserved,
    Lossy,
    Dropped,
    Unsupported,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProtocolMappingAuditEntry {
    pub field: String,
    pub disposition: ProtocolAuditDisposition,
    pub reason: String,
    pub source_protocol: Option<String>,
    pub target_protocol: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct ProtocolMappingAudit {
    pub preserved: Vec<ProtocolMappingAuditEntry>,
    pub lossy: Vec<ProtocolMappingAuditEntry>,
    pub dropped: Vec<ProtocolMappingAuditEntry>,
    pub unsupported: Vec<ProtocolMappingAuditEntry>,
}

impl ProtocolMappingAudit {
    pub fn append(&mut self, entry: ProtocolMappingAuditEntry) {
        let bucket = match entry.disposition {
            ProtocolAuditDisposition::Preserved => &mut self.preserved,
            ProtocolAuditDisposition::Lossy => &mut self.lossy,
            ProtocolAuditDisposition::Dropped => &mut self.dropped,
            ProtocolAuditDisposition::Unsupported => &mut self.unsupported,
        };

        if !bucket.iter().any(|existing| existing == &entry) {
            bucket.push(entry);
        }
    }

    pub fn is_empty(&self) -> bool {
        self.preserved.is_empty()
            && self.lossy.is_empty()
            && self.dropped.is_empty()
            && self.unsupported.is_empty()
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct JsonMappingError {
    message: String,
}

impl JsonMappingError {
    fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
        }
    }
}

impl Display for JsonMappingError {
    fn fmt(&self, f: &mut Formatter<'_>) -> fmt::Result {
        f.write_str(&self.message)
    }
}

impl Error for JsonMappingError {}

pub fn project_json_fields(
    source: &Value,
    rules: &[JsonFieldMappingRule],
) -> Result<Map<String, Value>, JsonMappingError> {
    let mut projected = Map::with_capacity(rules.len());

    for rule in rules {
        match source.pointer(rule.source_pointer) {
            Some(value) => {
                projected.insert(rule.target_field.to_string(), value.clone());
            }
            None if rule.required => {
                return Err(JsonMappingError::new(format!(
                    "required source pointer missing: {}",
                    rule.source_pointer
                )));
            }
            None => {}
        }
    }

    Ok(projected)
}

pub(crate) fn protocol_mapping_audit_to_value(audit: &ProtocolMappingAudit) -> Value {
    json!({
        "preserved": audit_entries_to_value(&audit.preserved),
        "lossy": audit_entries_to_value(&audit.lossy),
        "dropped": audit_entries_to_value(&audit.dropped),
        "unsupported": audit_entries_to_value(&audit.unsupported),
    })
}

fn audit_entries_to_value(entries: &[ProtocolMappingAuditEntry]) -> Value {
    Value::Array(
        entries
            .iter()
            .map(|entry| {
                json!({
                    "field": entry.field,
                    "disposition": audit_disposition_name(&entry.disposition),
                    "reason": entry.reason,
                    "source_protocol": entry.source_protocol,
                    "target_protocol": entry.target_protocol,
                })
            })
            .collect(),
    )
}

fn audit_disposition_name(disposition: &ProtocolAuditDisposition) -> &'static str {
    match disposition {
        ProtocolAuditDisposition::Preserved => "preserved",
        ProtocolAuditDisposition::Lossy => "lossy",
        ProtocolAuditDisposition::Dropped => "dropped",
        ProtocolAuditDisposition::Unsupported => "unsupported",
    }
}

#[cfg(test)]
mod tests {
    use super::{
        project_json_fields, protocol_mapping_audit_to_value, JsonFieldMappingRule,
        ProtocolAuditDisposition, ProtocolMappingAudit, ProtocolMappingAuditEntry,
    };
    use serde_json::json;

    #[test]
    fn project_json_fields_copies_only_requested_fields() {
        let projected = project_json_fields(
            &json!({
                "model": "claude-sonnet-4-5",
                "stream": true,
                "metadata": {
                    "conversation_id": "conv-1"
                },
                "extra": "drop-me"
            }),
            &[
                JsonFieldMappingRule {
                    source_pointer: "/model",
                    target_field: "model",
                    required: true,
                },
                JsonFieldMappingRule {
                    source_pointer: "/metadata/conversation_id",
                    target_field: "conversation_id",
                    required: false,
                },
            ],
        )
        .expect("project");

        assert_eq!(projected.get("model"), Some(&json!("claude-sonnet-4-5")));
        assert_eq!(projected.get("conversation_id"), Some(&json!("conv-1")));
        assert!(!projected.contains_key("extra"));
    }

    #[test]
    fn project_json_fields_fails_on_missing_required_pointer() {
        let error = project_json_fields(
            &json!({
                "model": "claude-sonnet-4-5"
            }),
            &[JsonFieldMappingRule {
                source_pointer: "/input",
                target_field: "messages",
                required: true,
            }],
        )
        .expect_err("must fail");

        assert!(error
            .to_string()
            .contains("required source pointer missing: /input"));
    }

    #[test]
    fn protocol_mapping_audit_deduplicates_entries_by_value() {
        let mut audit = ProtocolMappingAudit::default();
        let entry = ProtocolMappingAuditEntry {
            field: "reasoning".to_string(),
            disposition: ProtocolAuditDisposition::Lossy,
            reason: "anthropic thinking budget differs".to_string(),
            source_protocol: Some("openai-responses".to_string()),
            target_protocol: Some("anthropic-messages".to_string()),
        };

        audit.append(entry.clone());
        audit.append(entry);

        assert_eq!(audit.lossy.len(), 1);
        assert!(audit.preserved.is_empty());
        assert!(audit.dropped.is_empty());
        assert!(audit.unsupported.is_empty());
    }

    #[test]
    fn protocol_mapping_audit_to_value_preserves_bucket_and_entry_semantics() {
        let mut audit = ProtocolMappingAudit::default();
        audit.append(ProtocolMappingAuditEntry {
            field: "tool_choice".to_string(),
            disposition: ProtocolAuditDisposition::Preserved,
            reason: "preserved_verbatim_top_level".to_string(),
            source_protocol: Some("openai-responses".to_string()),
            target_protocol: Some("anthropic-messages".to_string()),
        });

        let value = protocol_mapping_audit_to_value(&audit);

        assert_eq!(
            value["preserved"][0],
            json!({
                "field": "tool_choice",
                "disposition": "preserved",
                "reason": "preserved_verbatim_top_level",
                "source_protocol": "openai-responses",
                "target_protocol": "anthropic-messages",
            })
        );
        assert_eq!(value["lossy"], json!([]));
        assert_eq!(value["dropped"], json!([]));
        assert_eq!(value["unsupported"], json!([]));
    }
}
