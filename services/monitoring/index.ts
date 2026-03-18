/**
 * TONAIAgent - Agent Monitoring Dashboard
 *
 * Public exports for the Monitoring Dashboard module (Issue #215).
 *
 * The Monitoring Dashboard provides real-time visualization of:
 * - Agent status
 * - Portfolio value
 * - Active positions
 * - Recent trades
 * - Performance metrics
 *
 * Usage:
 *   import {
 *     MonitoringMetricsService,
 *     MonitoringApi,
 *     createMonitoringApi,
 *     createDemoMonitoringApi,
 *     DashboardRenderer,
 *     renderDashboardOverview,
 *   } from './monitoring';
 *
 * Quick Start:
 *   const api = createDemoMonitoringApi();
 *
 *   // Get dashboard overview
 *   const response = await api.handle({
 *     method: 'GET',
 *     path: '/api/monitoring/dashboard',
 *   });
 *
 *   // Get agent metrics
 *   const metricsResponse = await api.handle({
 *     method: 'GET',
 *     path: '/api/monitoring/agents/agent_001/metrics',
 *   });
 *
 * API Endpoints:
 *   GET /api/monitoring/dashboard           - Dashboard overview
 *   GET /api/monitoring/agents/:id/metrics  - Agent metrics
 *   GET /api/monitoring/agents/:id/positions - Agent positions
 *   GET /api/monitoring/agents/:id/trades   - Trade history
 *   GET /api/monitoring/agents/:id/performance - Equity curve
 *   GET /api/monitoring/agents/:id/risk     - Risk indicators
 */

// Types
export * from './types';

// Metrics Service
export {
  MonitoringMetricsService,
  createMonitoringMetricsService,
  createDemoMonitoringMetricsService,
} from './metrics';

// API
export {
  MonitoringApi,
  createMonitoringApi,
  createDemoMonitoringApi,
} from './api';

// Dashboard UI
export {
  DashboardRenderer,
  createDashboardRenderer,
  // Renderers
  renderDashboardOverview,
  renderMetricsPanel,
  renderPositionsTable,
  renderTradesTable,
  renderRiskPanel,
  renderEquityCurve,
  // Utilities
  getStatusEmoji,
  getRiskEmoji,
  formatPnl,
  formatRoi,
  formatCurrency,
} from './dashboard';
