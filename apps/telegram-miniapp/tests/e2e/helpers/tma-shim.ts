/**
 * Telegram Mini App shim for Playwright tests.
 *
 * Injected via page.addInitScript() before each test so that app.js finds a
 * valid window.Telegram.WebApp and completes its normal startup flow
 * (expand → ready → tg:ready event → reveals #main-content).
 *
 * We do NOT mock window.App here — app.js creates it at startup and we let it
 * run normally.  The only thing we intercept is window.Telegram.WebApp so the
 * test browser doesn't crash on missing Telegram APIs.
 */
export const TMA_SHIM_SCRIPT = `
  (function() {
    window.Telegram = {
      WebApp: {
        initData: '',
        initDataUnsafe: { user: { id: 12345, first_name: 'TestUser', last_name: 'Bot', username: 'testuser' } },
        colorScheme: 'dark',
        themeParams: {
          bg_color: '#0e1117',
          text_color: '#e8edf5',
          hint_color: '#6b7a99',
          link_color: '#00A8FF',
          button_color: '#0088CC',
          button_text_color: '#ffffff',
          secondary_bg_color: '#1a1f2e',
        },
        expand: function() {},
        enableClosingConfirmation: function() {},
        ready: function() {},
        onEvent: function() {},
        showAlert: function(msg, cb) { console.log('[TG.showAlert]', msg); if (cb) cb(); },
        showConfirm: function(msg, cb) { console.log('[TG.showConfirm]', msg); if (cb) cb(true); },
        HapticFeedback: {
          impactOccurred: function() {},
          notificationOccurred: function() {},
          selectionChanged: function() {},
        },
        BackButton: {
          show: function() {},
          hide: function() {},
          onClick: function() {},
          offClick: function() {},
        },
      },
    };
  })();
`;

/**
 * Mock API responses for route interception in tests.
 */
export const API_MOCKS = {
  agentSimulation: {
    data: { tradingMode: 'simulation', id: 'agent-1', name: 'Test Agent' },
  },
  agentLive: {
    data: { tradingMode: 'live', id: 'agent-1', name: 'Test Agent' },
  },
  enableLiveSuccess: {
    data: { tradingMode: 'live', message: 'Live trading enabled' },
  },
  disableLiveSuccess: {
    data: { tradingMode: 'simulation', message: 'Simulation mode enabled' },
  },
  checklistPending: {
    data: {
      checklistVersion: 'v1',
      canEnableLiveTrading: false,
      items: [
        {
          item: {
            id: 'enable-2fa',
            title: 'Enable 2-Factor Authentication',
            description: 'Protect your account with 2FA.',
            category: 'account-security',
            mandatoryForLive: true,
          },
          acknowledged: false,
          acknowledgedAt: null,
        },
        {
          item: {
            id: 'verify-wallet',
            title: 'Verify Wallet Address',
            description: 'Confirm your TON wallet address is correct.',
            category: 'wallet',
            mandatoryForLive: true,
          },
          acknowledged: false,
          acknowledgedAt: null,
        },
        {
          item: {
            id: 'read-risk-guide',
            title: 'Read Risk Guide',
            description: 'Review the security and risk guide.',
            category: 'risk',
            mandatoryForLive: true,
          },
          acknowledged: false,
          acknowledgedAt: null,
        },
        {
          item: {
            id: 'sim-run',
            title: 'Completed Simulation Run',
            description: 'Run the agent in simulation mode for at least 24 hours.',
            category: 'simulation',
            mandatoryForLive: false,
          },
          acknowledged: false,
          acknowledgedAt: null,
        },
      ],
    },
  },
  checklistComplete: {
    data: {
      checklistVersion: 'v1',
      canEnableLiveTrading: true,
      items: [
        {
          item: {
            id: 'enable-2fa',
            title: 'Enable 2-Factor Authentication',
            description: 'Protect your account with 2FA.',
            category: 'account-security',
            mandatoryForLive: true,
          },
          acknowledged: true,
          acknowledgedAt: '2024-01-01T00:00:00Z',
        },
        {
          item: {
            id: 'verify-wallet',
            title: 'Verify Wallet Address',
            description: 'Confirm your TON wallet address is correct.',
            category: 'wallet',
            mandatoryForLive: true,
          },
          acknowledged: true,
          acknowledgedAt: '2024-01-01T00:00:00Z',
        },
        {
          item: {
            id: 'read-risk-guide',
            title: 'Read Risk Guide',
            description: 'Review the security and risk guide.',
            category: 'risk',
            mandatoryForLive: true,
          },
          acknowledged: true,
          acknowledgedAt: '2024-01-01T00:00:00Z',
        },
        {
          item: {
            id: 'sim-run',
            title: 'Completed Simulation Run',
            description: 'Run the agent in simulation mode for at least 24 hours.',
            category: 'simulation',
            mandatoryForLive: false,
          },
          acknowledged: false,
          acknowledgedAt: null,
        },
      ],
    },
  },
};
