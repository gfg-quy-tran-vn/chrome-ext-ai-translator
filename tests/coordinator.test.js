import test from 'node:test';
import assert from 'node:assert/strict';

import { runRewrite } from '../src/coordinator.js';
import { createDefaultSettings } from '../src/core/settings.js';
import { ProviderError } from '../src/providers/provider-error.js';

function dependencies(overrides = {}) {
  const states = [];
  return {
    states,
    value: {
      loadSettings: async () => createDefaultSettings({
        openaiApiKey: 'openai-secret',
      }),
      saveState: async (state) => states.push(state),
      makeRequestId: () => 'request-1',
      providers: {
        openai: async ({ prompt }) => `done:${prompt}`,
        gemini: async () => 'gemini result',
      },
      ...overrides,
    },
  };
}

test('saves loading then successful OpenAI states without leaking keys', async () => {
  const deps = dependencies();

  const result = await runRewrite(' rough text ', deps.value);

  assert.deepEqual(deps.states.map((state) => state.status), ['loading', 'success']);
  assert.equal(deps.states[0].selectedText, 'rough text');
  assert.equal(deps.states[0].provider, 'openai');
  assert.match(deps.states[1].result, /Selected text:\n---\nrough text\n---/);
  assert.equal(JSON.stringify(deps.states).includes('openai-secret'), false);
  assert.deepEqual(result, deps.states[1]);
});

test('dispatches to the active Gemini adapter with its configuration', async () => {
  let received;
  const deps = dependencies({
    loadSettings: async () => createDefaultSettings({
      provider: 'gemini',
      geminiApiKey: 'gemini-secret',
      geminiModel: 'gemini-test',
      prompt: 'Improve this.',
    }),
    providers: {
      openai: async () => assert.fail('OpenAI should not be called'),
      gemini: async (options) => {
        received = options;
        return 'Improved.';
      },
    },
  });

  const result = await runRewrite('words', deps.value);

  assert.deepEqual(received, {
    apiKey: 'gemini-secret',
    model: 'gemini-test',
    prompt: 'Improve this.\n\nSelected text:\n---\nwords\n---',
  });
  assert.equal(result.result, 'Improved.');
  assert.equal(JSON.stringify(deps.states).includes('gemini-secret'), false);
});

test('turns invalid settings into a configuration error state', async () => {
  const deps = dependencies({
    loadSettings: async () => createDefaultSettings({ openaiApiKey: '' }),
  });

  const result = await runRewrite('words', deps.value);

  assert.deepEqual(deps.states.map((state) => state.status), ['loading', 'error']);
  assert.deepEqual(result.error, {
    message: 'Add your OpenAI API key in Settings.',
    retryable: false,
    configuration: true,
  });
});

test('turns provider failures into safe error states', async () => {
  const deps = dependencies({
    providers: {
      openai: async () => {
        throw new ProviderError('OpenAI rate limit reached. Try again shortly.', {
          retryable: true,
        });
      },
      gemini: async () => '',
    },
  });

  const result = await runRewrite('words', deps.value);

  assert.equal(result.status, 'error');
  assert.deepEqual(result.error, {
    message: 'OpenAI rate limit reached. Try again shortly.',
    retryable: true,
    configuration: false,
  });
});

test('rejects blank selected text before calling a provider', async () => {
  let called = false;
  const deps = dependencies({
    providers: {
      openai: async () => { called = true; },
      gemini: async () => { called = true; },
    },
  });

  const result = await runRewrite('   ', deps.value);

  assert.equal(called, false);
  assert.equal(result.status, 'error');
  assert.equal(result.error.message, 'Select some text before using Rewrite with AI.');
});
