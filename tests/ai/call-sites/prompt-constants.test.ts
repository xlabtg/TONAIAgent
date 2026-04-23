/**
 * Regression tests for static prompt constants in core/ai/prompts/.
 *
 * Validates that each exported constant:
 * 1. Is a non-empty string.
 * 2. Does not contain any template-literal placeholders (${...}).
 * 3. Does not contain user-data sentinels (should never accept injection).
 */

import { describe, it, expect } from 'vitest';
import {
  STRATEGY_SYSTEM_PROMPT,
  ANALYSIS_SYSTEM_PROMPT,
  RISK_ASSESSMENT_SYSTEM_PROMPT,
} from '../../../core/ai/prompts';

const PROMPTS = [
  { name: 'STRATEGY_SYSTEM_PROMPT', value: STRATEGY_SYSTEM_PROMPT },
  { name: 'ANALYSIS_SYSTEM_PROMPT', value: ANALYSIS_SYSTEM_PROMPT },
  { name: 'RISK_ASSESSMENT_SYSTEM_PROMPT', value: RISK_ASSESSMENT_SYSTEM_PROMPT },
];

describe('static prompt constants', () => {
  it.each(PROMPTS)('$name is a non-empty string', ({ value }) => {
    expect(typeof value).toBe('string');
    expect(value.length).toBeGreaterThan(0);
  });

  it.each(PROMPTS)(
    '$name contains no template-literal placeholders',
    ({ value }) => {
      // Real template literal interpolations should never appear in static prompts
      expect(value).not.toMatch(/\$\{/);
    }
  );

  it.each(PROMPTS)(
    '$name contains no injection markers',
    ({ value }) => {
      expect(value).not.toContain('[system]');
      expect(value).not.toContain('[admin]');
      expect(value).not.toContain('{{');
      expect(value).not.toContain('<script>');
    }
  );

  it('all three prompts are distinct', () => {
    const values = PROMPTS.map((p) => p.value);
    const unique = new Set(values);
    expect(unique.size).toBe(PROMPTS.length);
  });
});
