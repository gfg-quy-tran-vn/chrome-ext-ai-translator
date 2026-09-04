import assert from 'node:assert/strict';
import test from 'node:test';

import { handleModelDiscovery } from '../src/model-discovery.js';
import { ProviderError } from '../src/providers/provider-error.js';

test('rejects an unknown provider without calling an adapter', async () => {
  let called = false;

  const result = await handleModelDiscovery(
    { provider: 'other', apiKey: 'secret' },
    {
      providers: {
        other: async () => {
          called = true;
          return [];
        },
      },
    },
  );

  assert.equal(called, false);
  assert.deepEqual(result, {
    ok: false,
    error: {
      message: 'Choose OpenAI or Gemini before loading models.',
      invalidKey: false,
      retryable: false,
    },
  });
});

test('rejects a blank API key without calling the provider', async () => {
  let called = false;

  const result = await handleModelDiscovery(
    { provider: 'openai', apiKey: '   ' },
    {
      providers: {
        openai: async () => {
          called = true;
          return [];
        },
      },
    },
  );

  assert.equal(called, false);
  assert.equal(result.ok, false);
  assert.equal(result.error.message, 'Enter an OpenAI API key first.');
});

test('dispatches a trimmed key to the selected provider', async () => {
  let received;

  const result = await handleModelDiscovery(
    { provider: 'gemini', apiKey: '  gemini-key  ' },
    {
      providers: {
        openai: async () => ['unused'],
        gemini: async (configuration) => {
          received = configuration;
          return ['gemini-2.5-flash'];
        },
      },
    },
  );

  assert.deepEqual(received, { apiKey: 'gemini-key' });
  assert.deepEqual(result, {
    ok: true,
    models: ['gemini-2.5-flash'],
  });
});

test('returns only safe ProviderError details', async () => {
  const result = await handleModelDiscovery(
    { provider: 'openai', apiKey: 'do-not-return-me' },
    {
      providers: {
        openai: async () => {
          const error = new ProviderError('OpenAI rejected the API key.', {
            retryable: false,
            configuration: true,
            invalidKey: true,
          });
          error.apiKey = 'do-not-return-me';
          error.responseBody = { private: true };
          throw error;
        },
      },
    },
  );

  assert.deepEqual(result, {
    ok: false,
    error: {
      message: 'OpenAI rejected the API key.',
      invalidKey: true,
      retryable: false,
    },
  });
  assert.equal(JSON.stringify(result).includes('do-not-return-me'), false);
});

test('normalizes unexpected adapter failures', async () => {
  const result = await handleModelDiscovery(
    { provider: 'gemini', apiKey: 'secret' },
    {
      providers: {
        gemini: async () => {
          throw new Error('raw upstream details');
        },
      },
    },
  );

  assert.deepEqual(result, {
    ok: false,
    error: {
      message: 'Could not load Gemini models. Try again.',
      invalidKey: false,
      retryable: true,
    },
  });
});
