// Rule Evaluator Component for Virtual Model Rules Module

import { VirtualModelRule, EvaluationContext, RuleCondition } from '../types/VirtualModelRulesTypes';

/**
 * Rule Evaluator component handles condition evaluation and matching logic
 * Provides various condition operators and evaluation strategies
 */
export class RuleEvaluator {
  
  /**
   * Evaluate rule conditions
   */
  async evaluateConditions(rule: VirtualModelRule, context: EvaluationContext): Promise<{
    matched: boolean;
    confidence: number;
    details: any[];
  }> {
    console.log(`Evaluating conditions for rule: ${rule.id}`);
    
    const results = [];
    let totalConfidence = 0;
    let matchCount = 0;
    
    for (const condition of rule.conditions) {
      const result = await this.evaluateCondition(condition, context);
      results.push(result);
      totalConfidence += result.confidence;
      if (result.matched) matchCount++;
    }
    
    const avgConfidence = results.length > 0 ? totalConfidence / results.length : 0;
    const matched = matchCount === rule.conditions.length;
    
    return {
      matched,
      confidence: avgConfidence,
      details: results
    };
  }
  
  /**
   * Evaluate a single condition
   */
  async evaluateCondition(condition: RuleCondition, context: EvaluationContext): Promise<{
    matched: boolean;
    confidence: number;
    details: any;
  }> {
    console.log(`Evaluating condition: ${condition.field} ${condition.operator} ${condition.value}`);
    
    // Get field value from context
    const fieldValue = this.getFieldValue(context, condition.field);
    
    // Evaluate based on operator
    let matched = false;
    let confidence = 0;
    
    switch (condition.operator) {
      case 'equals':
        matched = fieldValue === condition.value;
        confidence = matched ? 1 : 0;
        break;
      case 'contains':
        matched = typeof fieldValue === 'string' && fieldValue.includes(condition.value);
        confidence = matched ? 0.9 : 0;
        break;
      case 'greater_than':
        matched = typeof fieldValue === 'number' && fieldValue > condition.value;
        confidence = matched ? 1 : 0;
        break;
      case 'less_than':
        matched = typeof fieldValue === 'number' && fieldValue < condition.value;
        confidence = matched ? 1 : 0;
        break;
      // Add more operators as needed
      default:
        matched = false;
        confidence = 0;
    }
    
    return {
      matched,
      confidence,
      details: { fieldValue, condition }
    };
  }
  
  /**
   * Get field value from context
   */
  private getFieldValue(context: EvaluationContext, field: string): any {
    const parts = field.split('.');
    let value: any = context;
    
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }
  
  /**
   * Calculate condition weight
   */
  calculateConditionWeight(condition: RuleCondition): number {
    return condition.weight || 1;
  }
  
  /**
   * Validate condition structure
   */
  validateCondition(condition: RuleCondition): boolean {
    return !!(condition.field && condition.operator && condition.value !== undefined);
  }
}