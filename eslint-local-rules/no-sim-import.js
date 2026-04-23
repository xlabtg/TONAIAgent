'use strict';

/**
 * ESLint rule: no-sim-import
 *
 * Prevents production code from importing the JS factory simulation that lives
 * in `tests/fakes/`. The simulation is a pure in-memory stand-in for the
 * on-chain AgentFactory Tact contract. It must only be used from test files
 * (*.test.ts / *.spec.ts / tests/**) to keep test results isolated from real
 * on-chain behaviour.
 *
 * Importing the simulation from production code is dangerous because:
 *  1. Results diverge from real on-chain behaviour silently.
 *  2. Security fixes in the Tact contract are not reflected in the simulation.
 *
 * Flagged patterns:
 *   import { ... } from 'tests/fakes/factory-contract.fake'
 *   import { ... } from '../../tests/fakes/factory-contract.fake'
 *   require('tests/fakes/factory-contract.fake')
 *
 * See docs/contracts-migration.md for the migration plan.
 */

const SIM_PATH_PATTERN = /tests[\\/]fakes[\\/]factory-contract\.fake/;

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow importing the JS factory simulation from non-test production code.',
      category: 'Smart Contracts',
      recommended: true,
      url: 'https://github.com/xlabtg/TONAIAgent/blob/main/docs/contracts-migration.md',
    },
    messages: {
      noSimImport:
        'Do not import the JS factory simulation (tests/fakes/factory-contract.fake) ' +
        'from production code. Use the real on-chain contract wrappers in ' +
        'contracts/wrappers/ or the connectors/ton-factory public API instead. ' +
        'See docs/contracts-migration.md.',
    },
    schema: [],
  },

  create(context) {
    function checkSource(node, sourceValue) {
      if (SIM_PATH_PATTERN.test(sourceValue)) {
        context.report({ node, messageId: 'noSimImport' });
      }
    }

    return {
      ImportDeclaration(node) {
        checkSource(node, node.source.value);
      },
      // Also catch dynamic require() calls
      CallExpression(node) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length === 1 &&
          node.arguments[0].type === 'Literal' &&
          typeof node.arguments[0].value === 'string'
        ) {
          checkSource(node, node.arguments[0].value);
        }
      },
    };
  },
};
