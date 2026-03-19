/**
 * TONAIAgent - Alert System
 *
 * Public exports for the Alerts module (Issue #275).
 *
 * The Alert System detects anomalies and fires structured alert events:
 * - High drawdown
 * - Execution failure spikes
 * - API error spikes
 * - Abnormal agent behaviour
 * - High slippage
 *
 * Usage:
 *   import { createAlertService } from './alerts';
 *
 * Quick Start:
 *   const alerts = createAlertService();
 *   alerts.subscribe(alert => console.log('ALERT:', alert.type));
 *   alerts.checkDrawdown('agent_001', -8.5);
 */

export {
  AlertService,
  createAlertService,
  DEFAULT_ALERT_THRESHOLDS,
} from './alerts';

export type {
  AlertSeverity,
  AlertType,
  AlertEvent,
  AlertHandler,
  AlertUnsubscribe,
  AlertThresholds,
} from './alerts';
