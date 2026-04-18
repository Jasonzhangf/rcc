use serde_json::{Map, Value};

pub fn preprocess_routing_instructions(
    instructions: &[Map<String, Value>],
) -> Vec<Map<String, Value>> {
    let clear_index = instructions
        .iter()
        .position(|inst| instruction_type(inst) == Some("clear"));
    match clear_index {
        Some(index) => instructions.iter().skip(index + 1).cloned().collect(),
        None => instructions.to_vec(),
    }
}

pub fn has_clear_instruction(instructions: &[Map<String, Value>]) -> bool {
    instructions
        .iter()
        .any(|inst| instruction_type(inst) == Some("clear"))
}

pub fn has_stop_message_clear_instruction(instructions: &[Map<String, Value>]) -> bool {
    instructions
        .iter()
        .any(|inst| instruction_type(inst) == Some("stopMessageClear"))
}

fn instruction_type(record: &Map<String, Value>) -> Option<&str> {
    record.get("type").and_then(Value::as_str)
}

#[cfg(test)]
mod tests {
    use super::{
        has_clear_instruction, has_stop_message_clear_instruction, preprocess_routing_instructions,
    };
    use serde_json::{json, Map, Value};

    fn item(value: Value) -> Map<String, Value> {
        value.as_object().cloned().expect("object")
    }

    #[test]
    fn preprocess_returns_empty_for_empty_input() {
        let result = preprocess_routing_instructions(&[]);
        assert!(result.is_empty());
    }

    #[test]
    fn preprocess_returns_copy_when_no_clear_exists() {
        let input = vec![
            item(json!({"type": "force"})),
            item(json!({"type": "allow"})),
        ];
        let result = preprocess_routing_instructions(&input);
        assert_eq!(result, input);
    }

    #[test]
    fn preprocess_keeps_only_after_first_clear() {
        let input = vec![
            item(json!({"type": "force"})),
            item(json!({"type": "clear"})),
            item(json!({"type": "allow"})),
            item(json!({"type": "clear"})),
            item(json!({"type": "prefer"})),
        ];
        let result = preprocess_routing_instructions(&input);
        assert_eq!(
            result,
            vec![
                item(json!({"type": "allow"})),
                item(json!({"type": "clear"})),
                item(json!({"type": "prefer"})),
            ]
        );
    }

    #[test]
    fn detects_clear_instruction() {
        let input = vec![
            item(json!({"type": "allow"})),
            item(json!({"type": "clear"})),
        ];
        assert!(has_clear_instruction(&input));
        assert!(!has_clear_instruction(&[item(json!({"type": "allow"}))]));
    }

    #[test]
    fn detects_stop_message_clear_instruction() {
        let input = vec![
            item(json!({"type": "allow"})),
            item(json!({"type": "stopMessageClear"})),
        ];
        assert!(has_stop_message_clear_instruction(&input));
        assert!(!has_stop_message_clear_instruction(&[item(
            json!({"type": "clear"})
        )]));
    }
}
