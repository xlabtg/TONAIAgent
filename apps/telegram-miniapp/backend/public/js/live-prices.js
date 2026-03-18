/**
 * TON AI Agent - Live Price Stream UI (Issue #251)
 *
 * Real-time price ticker for the Telegram Mini App.
 * Polls the backend /api/prices endpoint and updates the UI
 * without page refreshes, providing a streaming UX.
 *
 * Usage:
 *   LivePrices.start();  // Begin polling
 *   LivePrices.stop();   // Stop polling
 *   LivePrices.onTick(function(tick) { ... }); // Subscribe to price updates
 */

var LivePrices = (function() {
  'use strict';

  // ============================================================================
  // Configuration
  // ============================================================================

  var CONFIG = {
    /** Poll interval in milliseconds (1 second for sub-second UX) */
    pollIntervalMs: 1000,
    /** API endpoint for live prices */
    apiEndpoint: '/api/prices',
    /** Assets to display */
    assets: ['TON', 'BTC', 'ETH', 'SOL', 'USDT'],
    /** Baseline prices (used as fallback when API is unavailable) */
    baseline: {
      TON:  5.25,
      BTC:  65000,
      ETH:  3500,
      SOL:  175,
      USDT: 1.00
    },
    /** Simulated jitter amplitude (fraction of price) for demo mode */
    simulationJitter: 0.005
  };

  // ============================================================================
  // Internal State
  // ============================================================================

  var state = {
    running: false,
    timer: null,
    prices: {},        // asset → { price, change24h, timestamp }
    prevPrices: {},    // for change detection
    handlers: [],      // PriceTick callbacks
    errorCount: 0,
    tickCount: 0,
    simulation: false  // use simulated prices when backend unavailable
  };

  // Initialize baseline prices in state
  for (var asset in CONFIG.baseline) {
    if (CONFIG.baseline.hasOwnProperty(asset)) {
      state.prices[asset] = {
        asset: asset,
        price: CONFIG.baseline[asset],
        change24h: 0,
        timestamp: new Date()
      };
    }
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Start the live price stream.
   */
  function start() {
    if (state.running) return;
    state.running = true;

    // Fetch immediately, then start interval
    fetchAndUpdate();
    state.timer = setInterval(fetchAndUpdate, CONFIG.pollIntervalMs);
  }

  /**
   * Stop the live price stream.
   */
  function stop() {
    if (!state.running) return;
    state.running = false;

    if (state.timer) {
      clearInterval(state.timer);
      state.timer = null;
    }
  }

  /**
   * Register a callback for price ticks.
   * @param {Function} handler - Called with { asset, price, change24h, pair, timestamp }
   * @returns {Function} Unsubscribe function
   */
  function onTick(handler) {
    if (typeof handler !== 'function') return function() {};
    state.handlers.push(handler);
    return function() {
      var idx = state.handlers.indexOf(handler);
      if (idx >= 0) state.handlers.splice(idx, 1);
    };
  }

  /**
   * Get the latest price for an asset.
   * @param {string} asset - e.g. 'TON'
   * @returns {{ price: number, change24h: number, timestamp: Date } | null}
   */
  function getPrice(asset) {
    return state.prices[asset.toUpperCase()] || null;
  }

  /**
   * Get all latest prices.
   * @returns {Object} asset → price data
   */
  function getAllPrices() {
    return Object.assign({}, state.prices);
  }

  /**
   * Returns stream metrics.
   */
  function getMetrics() {
    return {
      running: state.running,
      tickCount: state.tickCount,
      errorCount: state.errorCount,
      simulation: state.simulation,
      assetCount: Object.keys(state.prices).length
    };
  }

  // ============================================================================
  // Internal — Fetch and Update
  // ============================================================================

  /**
   * Fetch prices from the backend API and update the UI.
   */
  function fetchAndUpdate() {
    fetch(CONFIG.apiEndpoint)
      .then(function(response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      })
      .then(function(data) {
        state.errorCount = 0;
        state.simulation = false;

        // Parse response: expect { prices: { TON: { price, change24h }, ... } }
        var prices = data && data.prices ? data.prices : data;
        processPrices(prices, false);
      })
      .catch(function() {
        state.errorCount++;
        state.simulation = true;
        // Fall back to simulated prices
        processPrices(buildSimulatedPrices(), true);
      });
  }

  /**
   * Build simulated prices with random walk jitter.
   */
  function buildSimulatedPrices() {
    var simulated = {};
    for (var i = 0; i < CONFIG.assets.length; i++) {
      var asset = CONFIG.assets[i];
      var current = (state.prices[asset] && state.prices[asset].price) || CONFIG.baseline[asset] || 1;
      var jitter = (Math.random() * 2 - 1) * CONFIG.simulationJitter * current;
      simulated[asset] = {
        price: Math.max(0.0001, current + jitter),
        change24h: (state.prices[asset] && state.prices[asset].change24h) || (Math.random() * 10 - 5)
      };
    }
    return simulated;
  }

  /**
   * Process fetched/simulated prices and emit ticks.
   */
  function processPrices(prices, isSimulated) {
    if (!prices || typeof prices !== 'object') return;

    for (var i = 0; i < CONFIG.assets.length; i++) {
      var asset = CONFIG.assets[i];
      var raw = prices[asset];
      if (!raw) continue;

      var newPrice = typeof raw === 'number' ? raw : (raw.price || raw.priceUsd || 0);
      var change24h = typeof raw === 'object' ? (raw.change24h || raw.priceChange24h || 0) : 0;

      var prevPrice = state.prices[asset] && state.prices[asset].price;
      var priceChanged = prevPrice === undefined || prevPrice !== newPrice;

      if (priceChanged) {
        state.prices[asset] = {
          asset: asset,
          price: newPrice,
          change24h: change24h,
          pair: asset + '/USDT',
          timestamp: new Date(),
          isSimulated: isSimulated
        };

        state.tickCount++;
        emitTick(state.prices[asset]);
        updatePriceDOM(asset, state.prices[asset], prevPrice);
      }
    }
  }

  /**
   * Emit a price tick to all registered handlers.
   */
  function emitTick(tick) {
    for (var i = 0; i < state.handlers.length; i++) {
      try {
        state.handlers[i](tick);
      } catch (e) {
        // Swallow handler errors
      }
    }
  }

  // ============================================================================
  // Internal — DOM Updates
  // ============================================================================

  /**
   * Update price display elements in the DOM.
   * Looks for elements with data-live-price="ASSET" attributes.
   */
  function updatePriceDOM(asset, tick, prevPrice) {
    // Update all elements with data-live-price="ASSET"
    var priceEls = document.querySelectorAll('[data-live-price="' + asset + '"]');
    for (var i = 0; i < priceEls.length; i++) {
      var el = priceEls[i];
      el.textContent = formatPrice(asset, tick.price);
      el.setAttribute('data-price-raw', tick.price);

      // Flash animation: green for up, red for down
      if (prevPrice !== undefined && prevPrice !== tick.price) {
        var flashClass = tick.price > prevPrice ? 'price-up' : 'price-down';
        el.classList.add(flashClass);
        (function(element, cls) {
          setTimeout(function() { element.classList.remove(cls); }, 600);
        })(el, flashClass);
      }
    }

    // Update change elements: data-live-change="ASSET"
    var changeEls = document.querySelectorAll('[data-live-change="' + asset + '"]');
    for (var j = 0; j < changeEls.length; j++) {
      var cel = changeEls[j];
      var change = tick.change24h || 0;
      cel.textContent = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
      cel.className = cel.className.replace(/\bpositive\b|\bnegative\b/g, '');
      cel.classList.add(change >= 0 ? 'positive' : 'negative');
    }

    // Update pair elements: data-live-pair="TON/USDT"
    var pairKey = asset + '/USDT';
    var pairEls = document.querySelectorAll('[data-live-pair="' + pairKey + '"]');
    for (var k = 0; k < pairEls.length; k++) {
      pairEls[k].textContent = formatPrice(asset, tick.price);
    }
  }

  /**
   * Format a price for display.
   */
  function formatPrice(asset, price) {
    if (price >= 1000) {
      return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (price >= 1) {
      return '$' + price.toFixed(4);
    } else {
      return '$' + price.toFixed(6);
    }
  }

  // ============================================================================
  // Export
  // ============================================================================

  return {
    start: start,
    stop: stop,
    onTick: onTick,
    getPrice: getPrice,
    getAllPrices: getAllPrices,
    getMetrics: getMetrics,
    CONFIG: CONFIG
  };

})();
