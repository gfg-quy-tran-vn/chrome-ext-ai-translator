import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_PROMPT,
  createDefaultSettings,
  getActiveProviderConfig,
  validateSettings,
} from '../src/core/settings.js';

test('creates safe editable defaults', () => {
  assert.deepEqual(createDefaultSettings(), {
    provider: 'openai',
    openaiApiKey: '',
    openaiModel: 'gpt-5-mini',
    geminiApiKey: '',
    geminiModel: 'gemini-2.5-flash',
    prompt: DEFAULT_PROMPT,
  });
});

test('merges only known stored settings', () => {
  const settings = createDefaultSettings({
    provider: 'gemini',
    geminiApiKey: 'gemini-secret',
    unexpected: 'ignored',
  });

  assert.equal(settings.provider, 'gemini');
  assert.equal(settings.geminiApiKey, 'gemini-secret');
  assert.equal('unexpected' in settings, false);
});

test('returns only the active provider configuration', () => {
  const settings = createDefaultSettings({
    provider: 'gemini',
    openaiApiKey: 'openai-secret',
    geminiApiKey: 'gemini-secret',
    geminiModel: 'gemini-test',
  });

  assert.deepEqual(getActiveProviderConfig(settings), {
    provider: 'gemini',
    apiKey: 'gemini-secret',
    model: 'gemini-test',
  });
});

test('rejects unknown providers', () => {
  assert.deepEqual(validateSettings(createDefaultSettings({ provider: 'other' })), {
    valid: false,
    message: 'Choose OpenAI or Gemini in Settings.',
    configuration: true,
  });
});

test('rejects missing active provider API key without exposing another key', () => {
  const validation = validateSettings(createDefaultSettings({
    openaiApiKey: '',
    geminiApiKey: 'do-not-expose',
  }));

  assert.deepEqual(validation, {
    valid: false,
    message: 'Add your OpenAI API key in Settings.',
    configuration: true,
  });
  assert.equal(JSON.stringify(validation).includes('do-not-expose'), false);
});

test('rejects a missing model for the active provider', () => {
  const validation = validateSettings(createDefaultSettings({
    provider: 'gemini',
    geminiApiKey: 'secret',
    geminiModel: '   ',
  }));

  assert.deepEqual(validation, {
    valid: false,
    message: 'Add a Gemini model in Settings.',
    configuration: true,
  });
});

test('accepts a complete active provider configuration', () => {
  assert.deepEqual(validateSettings(createDefaultSettings({
    openaiApiKey: 'secret',
  })), { valid: true });
});
