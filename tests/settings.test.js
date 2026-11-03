import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_PROMPT,
  DEFAULT_PROMPT_ID,
  createDefaultSettings,
  findPrompt,
  getActiveProviderConfig,
  getActiveProviderModels,
  validatePrompts,
  validateSettings,
} from '../src/core/settings.js';

test('creates safe editable defaults', () => {
  assert.deepEqual(createDefaultSettings(), {
    provider: 'openai',
    openaiApiKey: '',
    openaiModel: 'gpt-5-mini',
    geminiApiKey: '',
    geminiModel: 'gemini-2.5-flash',
    openaiModels: [],
    geminiModels: [],
    prompts: [{ id: DEFAULT_PROMPT_ID, name: 'Rewrite', instruction: DEFAULT_PROMPT }],
  });
});

test('normalizes and deduplicates stored model lists', () => {
  const settings = createDefaultSettings({
    openaiModels: ['gpt-5', ' gpt-5 ', '', 7, 'gpt-5-mini'],
    geminiModels: 'not-an-array',
  });

  assert.deepEqual(settings.openaiModels, ['gpt-5', 'gpt-5-mini']);
  assert.deepEqual(settings.geminiModels, []);
});

test('returns the active provider model list', () => {
  const settings = createDefaultSettings({
    provider: 'gemini',
    openaiModels: ['gpt-5'],
    geminiModels: ['gemini-2.5-flash', 'gemini-2.5-pro'],
  });

  assert.deepEqual(getActiveProviderModels(settings), ['gemini-2.5-flash', 'gemini-2.5-pro']);
});

test('migrates a saved single prompt into a prompt named Rewrite', () => {
  const settings = createDefaultSettings({ prompt: 'Make it formal.' });

  assert.deepEqual(settings.prompts, [
    { id: DEFAULT_PROMPT_ID, name: 'Rewrite', instruction: 'Make it formal.' },
  ]);
});

test('keeps a stored prompt list and ignores the legacy prompt', () => {
  const settings = createDefaultSettings({
    prompt: 'legacy',
    prompts: [{ id: 'a', name: 'Formal', instruction: 'Be formal.' }],
  });

  assert.deepEqual(settings.prompts, [{ id: 'a', name: 'Formal', instruction: 'Be formal.' }]);
});

test('falls back to the default prompt when stored prompts are unusable', () => {
  const settings = createDefaultSettings({ prompts: [{ name: 'no id' }] });

  assert.deepEqual(settings.prompts, [
    { id: DEFAULT_PROMPT_ID, name: 'Rewrite', instruction: DEFAULT_PROMPT },
  ]);
});

test('finds a prompt by id and returns null when it is missing', () => {
  const prompts = [{ id: 'a', name: 'Formal', instruction: 'Be formal.' }];

  assert.equal(findPrompt(prompts, 'a'), prompts[0]);
  assert.equal(findPrompt(prompts, 'gone'), null);
});

test('validates prompt names and instructions', () => {
  assert.deepEqual(validatePrompts([]), {
    valid: false,
    message: 'Add at least one prompt.',
  });
  assert.deepEqual(validatePrompts([{ id: 'a', name: ' ', instruction: 'x' }]), {
    valid: false,
    message: 'Every prompt needs a name.',
  });
  assert.deepEqual(validatePrompts([{ id: 'a', name: 'Formal', instruction: '' }]), {
    valid: false,
    message: 'Add an instruction for "Formal".',
  });
  assert.deepEqual(validatePrompts([
    { id: 'a', name: 'Formal', instruction: 'x' },
    { id: 'b', name: 'formal', instruction: 'y' },
  ]), {
    valid: false,
    message: 'Prompt names must be unique: "formal".',
  });
  assert.deepEqual(validatePrompts([
    { id: 'a', name: 'Formal', instruction: 'x' },
    { id: 'b', name: 'Short', instruction: 'y' },
  ]), { valid: true });
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
