/**
 * TONAIAgent - Visual No-Code Control (Mobile)
 *
 * Provides mobile-optimized visual controls:
 * - Drag-and-drop workflows (simplified for mobile)
 * - Visual strategy builder
 * - Intuitive risk controls
 */

import {
  MobileWorkflowNode,
  MobileStrategyBuilder,
  MobileRiskSettings,
} from './types';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Visual control configuration
 */
export interface VisualControlConfig {
  /** Enable gestures */
  enableGestures?: boolean;
  /** Enable animations */
  enableAnimations?: boolean;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Snap to grid */
  snapToGrid?: boolean;
  /** Grid size */
  gridSize?: number;
  /** Max nodes per workflow */
  maxNodes?: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<VisualControlConfig> = {
  enableGestures: true,
  enableAnimations: true,
  animationDuration: 200,
  snapToGrid: true,
  gridSize: 16,
  maxNodes: 20,
};

// ============================================================================
// Node Templates
// ============================================================================

/**
 * Available trigger types for mobile
 */
export interface TriggerTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: 'time' | 'price' | 'portfolio' | 'external';
  config: TriggerConfig;
}

/**
 * Trigger configuration
 */
export interface TriggerConfig {
  /** Required parameters */
  requiredParams: ParamDefinition[];
  /** Optional parameters */
  optionalParams?: ParamDefinition[];
}

/**
 * Parameter definition
 */
export interface ParamDefinition {
  name: string;
  type: 'number' | 'string' | 'boolean' | 'select' | 'token' | 'time';
  label: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  default?: unknown;
  validation?: ParamValidation;
}

/**
 * Parameter validation rules
 */
export interface ParamValidation {
  min?: number;
  max?: number;
  pattern?: string;
  required?: boolean;
}

/**
 * Available condition types
 */
export interface ConditionTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: 'comparison' | 'logical' | 'portfolio';
  config: ConditionConfig;
}

/**
 * Condition configuration
 */
export interface ConditionConfig {
  /** Comparison operators */
  operators?: ('>' | '<' | '>=' | '<=' | '==' | '!=')[];
  /** Required parameters */
  requiredParams: ParamDefinition[];
}

/**
 * Available action types
 */
export interface ActionTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: 'trade' | 'transfer' | 'stake' | 'notification' | 'strategy';
  config: ActionConfig;
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * Action configuration
 */
export interface ActionConfig {
  /** Required parameters */
  requiredParams: ParamDefinition[];
  /** Optional parameters */
  optionalParams?: ParamDefinition[];
  /** Requires confirmation */
  requiresConfirmation: boolean;
}

// ============================================================================
// Pre-defined Templates
// ============================================================================

const TRIGGER_TEMPLATES: TriggerTemplate[] = [
  {
    id: 'time_interval',
    name: 'Time Interval',
    icon: '⏰',
    description: 'Trigger at regular intervals',
    category: 'time',
    config: {
      requiredParams: [
        {
          name: 'interval',
          type: 'select',
          label: 'Interval',
          options: [
            { value: 'hourly', label: 'Every hour' },
            { value: 'daily', label: 'Every day' },
            { value: 'weekly', label: 'Every week' },
            { value: 'monthly', label: 'Every month' },
          ],
        },
      ],
    },
  },
  {
    id: 'price_threshold',
    name: 'Price Alert',
    icon: '📊',
    description: 'Trigger when price crosses threshold',
    category: 'price',
    config: {
      requiredParams: [
        { name: 'token', type: 'token', label: 'Token' },
        {
          name: 'condition',
          type: 'select',
          label: 'Condition',
          options: [
            { value: 'above', label: 'Goes above' },
            { value: 'below', label: 'Goes below' },
          ],
        },
        { name: 'price', type: 'number', label: 'Price (USD)' },
      ],
    },
  },
  {
    id: 'portfolio_change',
    name: 'Portfolio Change',
    icon: '📈',
    description: 'Trigger on portfolio value change',
    category: 'portfolio',
    config: {
      requiredParams: [
        {
          name: 'direction',
          type: 'select',
          label: 'Direction',
          options: [
            { value: 'gain', label: 'Gains' },
            { value: 'loss', label: 'Loses' },
          ],
        },
        {
          name: 'percent',
          type: 'number',
          label: 'Percentage',
          validation: { min: 0.1, max: 100 },
        },
      ],
    },
  },
];

const CONDITION_TEMPLATES: ConditionTemplate[] = [
  {
    id: 'balance_check',
    name: 'Balance Check',
    icon: '💰',
    description: 'Check token balance',
    category: 'comparison',
    config: {
      operators: ['>', '<', '>=', '<='],
      requiredParams: [
        { name: 'token', type: 'token', label: 'Token' },
        { name: 'amount', type: 'number', label: 'Amount' },
      ],
    },
  },
  {
    id: 'price_check',
    name: 'Price Check',
    icon: '📉',
    description: 'Check current price',
    category: 'comparison',
    config: {
      operators: ['>', '<', '>=', '<='],
      requiredParams: [
        { name: 'token', type: 'token', label: 'Token' },
        { name: 'price', type: 'number', label: 'Price (USD)' },
      ],
    },
  },
  {
    id: 'time_check',
    name: 'Time Check',
    icon: '🕐',
    description: 'Check time of day',
    category: 'comparison',
    config: {
      requiredParams: [
        { name: 'startTime', type: 'time', label: 'Start Time' },
        { name: 'endTime', type: 'time', label: 'End Time' },
      ],
    },
  },
];

const ACTION_TEMPLATES: ActionTemplate[] = [
  {
    id: 'swap',
    name: 'Swap Tokens',
    icon: '🔄',
    description: 'Exchange one token for another',
    category: 'trade',
    riskLevel: 'medium',
    config: {
      requiresConfirmation: true,
      requiredParams: [
        { name: 'fromToken', type: 'token', label: 'From Token' },
        { name: 'toToken', type: 'token', label: 'To Token' },
        { name: 'amount', type: 'number', label: 'Amount' },
      ],
      optionalParams: [
        {
          name: 'slippage',
          type: 'number',
          label: 'Max Slippage %',
          default: 1,
          validation: { min: 0.1, max: 50 },
        },
      ],
    },
  },
  {
    id: 'stake',
    name: 'Stake Tokens',
    icon: '🥩',
    description: 'Stake tokens for rewards',
    category: 'stake',
    riskLevel: 'low',
    config: {
      requiresConfirmation: true,
      requiredParams: [
        { name: 'token', type: 'token', label: 'Token' },
        { name: 'amount', type: 'number', label: 'Amount' },
        {
          name: 'pool',
          type: 'select',
          label: 'Staking Pool',
          options: [
            { value: 'ton_whales', label: 'TON Whales' },
            { value: 'bemo', label: 'Bemo' },
          ],
        },
      ],
    },
  },
  {
    id: 'notify',
    name: 'Send Notification',
    icon: '🔔',
    description: 'Send yourself a notification',
    category: 'notification',
    riskLevel: 'low',
    config: {
      requiresConfirmation: false,
      requiredParams: [{ name: 'message', type: 'string', label: 'Message' }],
    },
  },
  {
    id: 'pause_strategy',
    name: 'Pause Strategy',
    icon: '⏸️',
    description: 'Pause the current strategy',
    category: 'strategy',
    riskLevel: 'low',
    config: {
      requiresConfirmation: false,
      requiredParams: [],
    },
  },
];

// ============================================================================
// Visual Control Manager
// ============================================================================

/**
 * Workflow validation result
 */
export interface WorkflowValidation {
  /** Is valid */
  valid: boolean;
  /** Error messages */
  errors: ValidationError[];
  /** Warning messages */
  warnings: ValidationWarning[];
  /** Overall risk score (0-100) */
  riskScore: number;
}

/**
 * Validation error
 */
export interface ValidationError {
  nodeId?: string;
  field?: string;
  message: string;
  code: string;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  nodeId?: string;
  message: string;
  code: string;
}

/**
 * Manages visual workflow controls for mobile
 */
export class VisualControlManager {
  private readonly config: Required<VisualControlConfig>;
  private readonly workflows: Map<string, MobileStrategyBuilder> = new Map();

  constructor(config: Partial<VisualControlConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================================================
  // Template Access
  // ============================================================================

  /**
   * Get all trigger templates
   */
  getTriggerTemplates(): TriggerTemplate[] {
    return TRIGGER_TEMPLATES;
  }

  /**
   * Get all condition templates
   */
  getConditionTemplates(): ConditionTemplate[] {
    return CONDITION_TEMPLATES;
  }

  /**
   * Get all action templates
   */
  getActionTemplates(): ActionTemplate[] {
    return ACTION_TEMPLATES;
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(
    type: 'trigger' | 'condition' | 'action',
    category: string
  ): (TriggerTemplate | ConditionTemplate | ActionTemplate)[] {
    switch (type) {
      case 'trigger':
        return TRIGGER_TEMPLATES.filter((t) => t.category === category);
      case 'condition':
        return CONDITION_TEMPLATES.filter((t) => t.category === category);
      case 'action':
        return ACTION_TEMPLATES.filter((t) => t.category === category);
      default:
        return [];
    }
  }

  // ============================================================================
  // Workflow Management
  // ============================================================================

  /**
   * Create a new workflow
   */
  createWorkflow(name: string): MobileStrategyBuilder {
    const workflowId = `workflow_${Date.now()}`;

    const workflow: MobileStrategyBuilder = {
      name,
      nodes: [],
      riskSettings: {
        riskLevel: 5,
        maxLossPercent: 10,
        stopLossEnabled: true,
        stopLossPercent: 5,
        takeProfitEnabled: false,
      },
      valid: false,
      errors: [],
    };

    this.workflows.set(workflowId, workflow);

    return workflow;
  }

  /**
   * Get workflow by ID
   */
  getWorkflow(workflowId: string): MobileStrategyBuilder | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * Add node to workflow
   */
  addNode(
    workflowId: string,
    nodeType: 'trigger' | 'condition' | 'action',
    templateId: string,
    config: Record<string, unknown> = {}
  ): MobileWorkflowNode | undefined {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return undefined;

    // Check max nodes
    if (workflow.nodes.length >= this.config.maxNodes) {
      return undefined;
    }

    // Get template
    const template = this.getTemplate(nodeType, templateId);
    if (!template) return undefined;

    const node: MobileWorkflowNode = {
      id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: nodeType,
      label: template.name,
      icon: template.icon,
      config,
      connections: [],
      expanded: true,
    };

    workflow.nodes.push(node);

    // Revalidate workflow
    this.validateWorkflowInternal(workflow);

    return node;
  }

  /**
   * Remove node from workflow
   */
  removeNode(workflowId: string, nodeId: string): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return false;

    const index = workflow.nodes.findIndex((n) => n.id === nodeId);
    if (index === -1) return false;

    // Remove node
    workflow.nodes.splice(index, 1);

    // Remove connections to this node
    for (const node of workflow.nodes) {
      node.connections = node.connections.filter((c) => c !== nodeId);
    }

    // Revalidate workflow
    this.validateWorkflowInternal(workflow);

    return true;
  }

  /**
   * Update node configuration
   */
  updateNodeConfig(
    workflowId: string,
    nodeId: string,
    config: Record<string, unknown>
  ): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return false;

    const node = workflow.nodes.find((n) => n.id === nodeId);
    if (!node) return false;

    node.config = { ...node.config, ...config };

    // Revalidate workflow
    this.validateWorkflowInternal(workflow);

    return true;
  }

  /**
   * Connect two nodes
   */
  connectNodes(
    workflowId: string,
    sourceNodeId: string,
    targetNodeId: string
  ): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return false;

    const sourceNode = workflow.nodes.find((n) => n.id === sourceNodeId);
    const targetNode = workflow.nodes.find((n) => n.id === targetNodeId);

    if (!sourceNode || !targetNode) return false;

    // Validate connection (can't connect action to trigger)
    if (sourceNode.type === 'action' && targetNode.type === 'trigger') {
      return false;
    }

    // Add connection
    if (!sourceNode.connections.includes(targetNodeId)) {
      sourceNode.connections.push(targetNodeId);
    }

    // Revalidate workflow
    this.validateWorkflowInternal(workflow);

    return true;
  }

  /**
   * Disconnect two nodes
   */
  disconnectNodes(
    workflowId: string,
    sourceNodeId: string,
    targetNodeId: string
  ): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return false;

    const sourceNode = workflow.nodes.find((n) => n.id === sourceNodeId);
    if (!sourceNode) return false;

    sourceNode.connections = sourceNode.connections.filter((c) => c !== targetNodeId);

    // Revalidate workflow
    this.validateWorkflowInternal(workflow);

    return true;
  }

  // ============================================================================
  // Risk Controls
  // ============================================================================

  /**
   * Update risk settings
   */
  updateRiskSettings(
    workflowId: string,
    settings: Partial<MobileRiskSettings>
  ): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return false;

    workflow.riskSettings = {
      ...workflow.riskSettings,
      ...settings,
    };

    // Revalidate workflow
    this.validateWorkflowInternal(workflow);

    return true;
  }

  /**
   * Get risk level description
   */
  getRiskLevelDescription(level: number): RiskLevelDescription {
    if (level <= 3) {
      return {
        level: 'low',
        label: 'Conservative',
        description: 'Low risk, stable returns',
        color: '#4caf50',
        icon: '🛡️',
      };
    } else if (level <= 6) {
      return {
        level: 'medium',
        label: 'Moderate',
        description: 'Balanced risk and reward',
        color: '#ff9800',
        icon: '⚖️',
      };
    } else {
      return {
        level: 'high',
        label: 'Aggressive',
        description: 'Higher risk, potential for higher returns',
        color: '#f44336',
        icon: '🚀',
      };
    }
  }

  /**
   * Get suggested risk settings for user level
   */
  getSuggestedRiskSettings(
    userLevel: 'beginner' | 'intermediate' | 'advanced'
  ): MobileRiskSettings {
    switch (userLevel) {
      case 'beginner':
        return {
          riskLevel: 3,
          maxLossPercent: 5,
          stopLossEnabled: true,
          stopLossPercent: 3,
          takeProfitEnabled: true,
          takeProfitPercent: 10,
        };
      case 'intermediate':
        return {
          riskLevel: 5,
          maxLossPercent: 10,
          stopLossEnabled: true,
          stopLossPercent: 5,
          takeProfitEnabled: true,
          takeProfitPercent: 20,
        };
      case 'advanced':
        return {
          riskLevel: 7,
          maxLossPercent: 15,
          stopLossEnabled: true,
          stopLossPercent: 8,
          takeProfitEnabled: false,
        };
    }
  }

  // ============================================================================
  // Validation
  // ============================================================================

  /**
   * Validate workflow
   */
  validateWorkflow(workflowId: string): WorkflowValidation {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      return {
        valid: false,
        errors: [{ message: 'Workflow not found', code: 'NOT_FOUND' }],
        warnings: [],
        riskScore: 0,
      };
    }

    return this.validateWorkflowInternal(workflow);
  }

  /**
   * Internal validation logic
   */
  private validateWorkflowInternal(workflow: MobileStrategyBuilder): WorkflowValidation {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let riskScore = workflow.riskSettings.riskLevel * 10;

    // Check for at least one trigger
    const triggers = workflow.nodes.filter((n) => n.type === 'trigger');
    if (triggers.length === 0) {
      errors.push({
        message: 'Workflow must have at least one trigger',
        code: 'NO_TRIGGER',
      });
    }

    // Check for at least one action
    const actions = workflow.nodes.filter((n) => n.type === 'action');
    if (actions.length === 0) {
      errors.push({
        message: 'Workflow must have at least one action',
        code: 'NO_ACTION',
      });
    }

    // Check all nodes have connections (except the last action)
    for (const node of workflow.nodes) {
      if (node.type !== 'action' && node.connections.length === 0) {
        warnings.push({
          nodeId: node.id,
          message: `Node "${node.label}" has no connections`,
          code: 'NO_CONNECTION',
        });
      }
    }

    // Validate node configurations
    for (const node of workflow.nodes) {
      const template = this.getTemplate(node.type, this.getTemplateIdFromNode(node));
      if (template) {
        const nodeErrors = this.validateNodeConfig(node, template);
        errors.push(...nodeErrors);
      }
    }

    // Calculate risk score based on actions
    for (const actionNode of actions) {
      const template = ACTION_TEMPLATES.find(
        (t) => t.name.toLowerCase() === actionNode.label.toLowerCase()
      );
      if (template?.riskLevel === 'high') {
        riskScore += 20;
      } else if (template?.riskLevel === 'medium') {
        riskScore += 10;
      }
    }

    // Adjust risk score based on risk settings
    if (!workflow.riskSettings.stopLossEnabled) {
      riskScore += 15;
      warnings.push({
        message: 'Stop-loss is disabled, which increases risk',
        code: 'NO_STOP_LOSS',
      });
    }

    if (workflow.riskSettings.maxLossPercent > 20) {
      warnings.push({
        message: 'High maximum loss percentage increases risk',
        code: 'HIGH_MAX_LOSS',
      });
    }

    riskScore = Math.min(100, Math.max(0, riskScore));

    // Update workflow state
    workflow.valid = errors.length === 0;
    workflow.errors = errors.map((e) => e.message);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      riskScore,
    };
  }

  /**
   * Validate node configuration
   */
  private validateNodeConfig(
    node: MobileWorkflowNode,
    template: TriggerTemplate | ConditionTemplate | ActionTemplate
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const requiredParams = template.config.requiredParams ?? [];

    for (const param of requiredParams) {
      if (param.validation?.required !== false) {
        const value = node.config[param.name];
        if (value === undefined || value === null || value === '') {
          errors.push({
            nodeId: node.id,
            field: param.name,
            message: `${param.label} is required`,
            code: 'REQUIRED_FIELD',
          });
        }
      }

      // Validate number ranges
      if (param.type === 'number' && param.validation) {
        const value = node.config[param.name] as number;
        if (value !== undefined) {
          if (param.validation.min !== undefined && value < param.validation.min) {
            errors.push({
              nodeId: node.id,
              field: param.name,
              message: `${param.label} must be at least ${param.validation.min}`,
              code: 'MIN_VALUE',
            });
          }
          if (param.validation.max !== undefined && value > param.validation.max) {
            errors.push({
              nodeId: node.id,
              field: param.name,
              message: `${param.label} must be at most ${param.validation.max}`,
              code: 'MAX_VALUE',
            });
          }
        }
      }
    }

    return errors;
  }

  // ============================================================================
  // Export/Import
  // ============================================================================

  /**
   * Export workflow to JSON
   */
  exportWorkflow(workflowId: string): string | undefined {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return undefined;

    return JSON.stringify(workflow, null, 2);
  }

  /**
   * Import workflow from JSON
   */
  importWorkflow(json: string): string | undefined {
    try {
      const workflow = JSON.parse(json) as MobileStrategyBuilder;

      // Generate new ID
      const workflowId = `workflow_${Date.now()}`;

      // Validate structure
      if (!workflow.name || !Array.isArray(workflow.nodes)) {
        return undefined;
      }

      this.workflows.set(workflowId, workflow);

      // Validate
      this.validateWorkflowInternal(workflow);

      return workflowId;
    } catch {
      return undefined;
    }
  }

  // ============================================================================
  // Quick Builder (Simplified)
  // ============================================================================

  /**
   * Create a simple DCA workflow
   */
  createDCAWorkflow(params: {
    name: string;
    fromToken: string;
    toToken: string;
    amount: number;
    interval: 'hourly' | 'daily' | 'weekly' | 'monthly';
  }): MobileStrategyBuilder {
    const workflow = this.createWorkflow(params.name);
    const workflowId = Array.from(this.workflows.entries()).find(
      ([, w]) => w === workflow
    )?.[0];

    if (!workflowId) return workflow;

    // Add trigger
    this.addNode(workflowId, 'trigger', 'time_interval', {
      interval: params.interval,
    });

    // Add swap action
    this.addNode(workflowId, 'action', 'swap', {
      fromToken: params.fromToken,
      toToken: params.toToken,
      amount: params.amount,
    });

    // Connect trigger to action
    const trigger = workflow.nodes.find((n) => n.type === 'trigger');
    const action = workflow.nodes.find((n) => n.type === 'action');

    if (trigger && action) {
      trigger.connections.push(action.id);
    }

    // Set conservative risk settings
    workflow.riskSettings = {
      riskLevel: 3,
      maxLossPercent: 5,
      stopLossEnabled: true,
      stopLossPercent: 5,
      takeProfitEnabled: false,
    };

    this.validateWorkflowInternal(workflow);

    return workflow;
  }

  /**
   * Create a price alert workflow
   */
  createPriceAlertWorkflow(params: {
    name: string;
    token: string;
    condition: 'above' | 'below';
    price: number;
    message: string;
  }): MobileStrategyBuilder {
    const workflow = this.createWorkflow(params.name);
    const workflowId = Array.from(this.workflows.entries()).find(
      ([, w]) => w === workflow
    )?.[0];

    if (!workflowId) return workflow;

    // Add price trigger
    this.addNode(workflowId, 'trigger', 'price_threshold', {
      token: params.token,
      condition: params.condition,
      price: params.price,
    });

    // Add notification action
    this.addNode(workflowId, 'action', 'notify', {
      message: params.message,
    });

    // Connect trigger to action
    const trigger = workflow.nodes.find((n) => n.type === 'trigger');
    const action = workflow.nodes.find((n) => n.type === 'action');

    if (trigger && action) {
      trigger.connections.push(action.id);
    }

    this.validateWorkflowInternal(workflow);

    return workflow;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private getTemplate(
    type: 'trigger' | 'condition' | 'action',
    templateId: string
  ): TriggerTemplate | ConditionTemplate | ActionTemplate | undefined {
    switch (type) {
      case 'trigger':
        return TRIGGER_TEMPLATES.find((t) => t.id === templateId);
      case 'condition':
        return CONDITION_TEMPLATES.find((t) => t.id === templateId);
      case 'action':
        return ACTION_TEMPLATES.find((t) => t.id === templateId);
      default:
        return undefined;
    }
  }

  private getTemplateIdFromNode(node: MobileWorkflowNode): string {
    // Try to match by label
    const label = node.label.toLowerCase().replace(/\s+/g, '_');

    const allTemplates = [
      ...TRIGGER_TEMPLATES,
      ...CONDITION_TEMPLATES,
      ...ACTION_TEMPLATES,
    ];

    const match = allTemplates.find(
      (t) => t.name.toLowerCase().replace(/\s+/g, '_') === label || t.id === label
    );

    return match?.id ?? '';
  }
}

// ============================================================================
// Supporting Types
// ============================================================================

/**
 * Risk level description
 */
export interface RiskLevelDescription {
  level: 'low' | 'medium' | 'high';
  label: string;
  description: string;
  color: string;
  icon: string;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a VisualControlManager with default configuration
 */
export function createVisualControlManager(
  config?: Partial<VisualControlConfig>
): VisualControlManager {
  return new VisualControlManager(config);
}

/**
 * Get all available templates
 */
export function getAllTemplates(): {
  triggers: TriggerTemplate[];
  conditions: ConditionTemplate[];
  actions: ActionTemplate[];
} {
  return {
    triggers: TRIGGER_TEMPLATES,
    conditions: CONDITION_TEMPLATES,
    actions: ACTION_TEMPLATES,
  };
}
