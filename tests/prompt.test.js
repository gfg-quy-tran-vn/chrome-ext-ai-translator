import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPrompt } from '../src/core/prompt.js';
import { DEFAULT_PROMPT } from '../src/core/settings.js';

test('builds a delimited prompt from trimmed values', () => {
  assert.equal(
    buildPrompt('  Improve this.  ', '  rough words  '),
    'Improve this.\n\nSelected text:\n---\nrough words\n---',
  );
});

test('uses the default instruction when the custom prompt is blank', () => {
  assert.equal(
    buildPrompt('   ', 'rough words'),
    `${DEFAULT_PROMPT}\n\nSelected text:\n---\nrough words\n---`,
  );
});

test('rejects blank selected text', () => {
  assert.throws(
    () => buildPrompt(DEFAULT_PROMPT, '   '),
    /Select some text before using Rewrite with AI\./,
  );
});
