'use strict';

/**
 * ESLint rule: no-ai-prompt-concat
 *
 * Flags template-literal or string-concatenation expressions used as the
 * `content` value of a `{ role: 'system', content: <expr> }` object literal
 * in any file that imports an AI SDK (openai, anthropic, groq, etc.).
 *
 * Rationale: system-role content must always be a static string constant.
 * User-supplied data must arrive in a structured user-role message via
 * PromptBuilder, never spliced into the system prompt.
 *
 * Safe patterns (not flagged):
 *   { role: 'system', content: STRATEGY_SYSTEM_PROMPT }          // identifier
 *   { role: 'system', content: prompts.ANALYSIS_SYSTEM_PROMPT }  // member expr
 *   { role: 'system', content: 'literal string' }                // string literal
 *
 * Unsafe patterns (flagged):
 *   { role: 'system', content: `Hello ${userName}` }             // template literal
 *   { role: 'system', content: 'Hello ' + userName }             // concatenation
 *   { role: 'system', content: buildPrompt(data) }               // call expression
 */

const AI_SDK_PACKAGES = [
  'openai',
  '@anthropic-ai/sdk',
  'anthropic',
  'groq-sdk',
  '@google/generative-ai',
  'openrouter',
];

/** Returns true when the source file imports any AI SDK package. */
function fileImportsAiSdk(context) {
  const program = context.getSourceCode().ast;
  return program.body.some((node) => {
    if (node.type !== 'ImportDeclaration') return false;
    return AI_SDK_PACKAGES.some((pkg) => node.source.value.startsWith(pkg));
  });
}

/** Returns true for a node that is safe as system-prompt content. */
function isSafeContent(node) {
  // String literals are always static.
  if (node.type === 'Literal' && typeof node.value === 'string') return true;
  // Identifier references (e.g. STRATEGY_SYSTEM_PROMPT) are treated as static constants.
  if (node.type === 'Identifier') return true;
  // Member expressions (e.g. SYSTEM_PROMPTS.STRATEGY) are treated as static.
  if (node.type === 'MemberExpression') return true;
  return false;
}

/** Returns true when a Property node is `role: 'system'`. */
function isSystemRoleProp(prop) {
  return (
    prop.type === 'Property' &&
    ((prop.key.type === 'Identifier' && prop.key.name === 'role') ||
      (prop.key.type === 'Literal' && prop.key.value === 'role')) &&
    prop.value.type === 'Literal' &&
    prop.value.value === 'system'
  );
}

/** Returns true when a Property node is a `content` key. */
function isContentProp(prop) {
  return (
    prop.type === 'Property' &&
    ((prop.key.type === 'Identifier' && prop.key.name === 'content') ||
      (prop.key.type === 'Literal' && prop.key.value === 'content'))
  );
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow template-literal or concatenation expressions in system-role message content.',
      category: 'AI Safety',
      recommended: true,
      url: 'https://github.com/xlabtg/TONAIAgent/blob/main/docs/ai-safety.md',
    },
    messages: {
      noAiPromptConcat:
        'System-role content must be a static constant — never a template literal, ' +
        'concatenation, or function call. Use PromptBuilder and core/ai/prompts/ instead.',
    },
    schema: [],
  },

  create(context) {
    let isAiFile = false;

    return {
      Program() {
        isAiFile = fileImportsAiSdk(context);
      },

      ObjectExpression(node) {
        if (!isAiFile) return;

        const hasSystemRole = node.properties.some(isSystemRoleProp);
        if (!hasSystemRole) return;

        const contentProp = node.properties.find(isContentProp);
        if (!contentProp) return;

        const contentValue = contentProp.value;
        if (!isSafeContent(contentValue)) {
          context.report({
            node: contentValue,
            messageId: 'noAiPromptConcat',
          });
        }
      },
    };
  },
};
