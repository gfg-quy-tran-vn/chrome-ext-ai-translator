import test from 'node:test';
import assert from 'node:assert/strict';

import { callOpenAI, listOpenAIModels } from '../src/providers/openai.js';
import { ProviderError } from '../src/providers/provider-error.js';

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

test('calls the OpenAI Responses API and combines output text blocks', async () => {
  const fetchImpl = async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, 'Bearer test-key');
    assert.equal(options.headers['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(options.body), {
      model: 'gpt-test',
      input: 'rewrite me',
    });
    return jsonResponse({
      output: [
        { content: [{ type: 'output_text', text: 'First.' }] },
        { content: [{ type: 'output_text', text: 'Second.' }] },
      ],
    });
  };

  const result = await callOpenAI({
    apiKey: 'test-key',
    model: 'gpt-test',
    prompt: 'rewrite me',
    fetchImpl,
  });

  assert.equal(result, 'First.\nSecond.');
});

test('normalizes rejected OpenAI credentials', async () => {
  await assert.rejects(
    callOpenAI({
      apiKey: 'secret-that-must-not-leak',
      model: 'gpt-test',
      prompt: 'rewrite',
      fetchImpl: async () => jsonResponse({}, 401),
    }),
    (error) => {
      assert.ok(error instanceof ProviderError);
      assert.equal(error.message, 'OpenAI rejected the API key. Check it in Settings.');
      assert.equal(error.configuration, true);
      assert.equal(error.retryable, false);
      assert.equal(error.message.includes('secret-that-must-not-leak'), false);
      return true;
    },
  );
});

test('marks OpenAI rate limits as retryable', async () => {
  await assert.rejects(
    callOpenAI({
      apiKey: 'secret', model: 'gpt-test', prompt: 'rewrite',
      fetchImpl: async () => jsonResponse({}, 429),
    }),
    (error) => {
      assert.equal(error.message, 'OpenAI rate limit reached. Try again shortly.');
      assert.equal(error.retryable, true);
      assert.equal(error.configuration, false);
      return true;
    },
  );
});

test('rejects an OpenAI response with no usable text', async () => {
  await assert.rejects(
    callOpenAI({
      apiKey: 'secret', model: 'gpt-test', prompt: 'rewrite',
      fetchImpl: async () => jsonResponse({ output: [] }),
    }),
    (error) => {
      assert.equal(error.message, 'OpenAI returned no text.');
      assert.equal(error.retryable, true);
      return true;
    },
  );
});

test('normalizes OpenAI network failures', async () => {
  await assert.rejects(
    callOpenAI({
      apiKey: 'secret', model: 'gpt-test', prompt: 'rewrite',
      fetchImpl: async () => { throw new TypeError('network details'); },
    }),
    (error) => {
      assert.equal(error.message, 'Could not reach OpenAI. Check your connection and try again.');
      assert.equal(error.retryable, true);
      return true;
    },
  );
});

test('lists, deduplicates, and sorts models available to an OpenAI key', async () => {
  const models = await listOpenAIModels({
    apiKey: 'test-key',
    fetchImpl: async (url, options) => {
      assert.equal(url, 'https://api.openai.com/v1/models');
      assert.equal(options.method, 'GET');
      assert.equal(options.headers.Authorization, 'Bearer test-key');
      assert.equal('body' in options, false);
      return jsonResponse({
        data: [
          { id: 'z-model' },
          { id: ' A-model ' },
          { id: 'A-model' },
          { id: '' },
          {},
        ],
      });
    },
  });

  assert.deepEqual(models, ['A-model', 'z-model']);
});

test('marks a rejected OpenAI model-list key as invalid', async () => {
  await assert.rejects(
    listOpenAIModels({
      apiKey: 'secret-that-must-not-leak',
      fetchImpl: async () => jsonResponse({}, 401),
    }),
    (error) => {
      assert.equal(error.invalidKey, true);
      assert.equal(error.configuration, true);
      assert.equal(error.retryable, false);
      assert.equal(error.message.includes('secret-that-must-not-leak'), false);
      return true;
    },
  );
});

test('rejects an empty OpenAI model list', async () => {
  await assert.rejects(
    listOpenAIModels({
      apiKey: 'secret',
      fetchImpl: async () => jsonResponse({ data: [{ id: '  ' }] }),
    }),
    (error) => {
      assert.equal(error.message, 'OpenAI returned no available models.');
      assert.equal(error.retryable, true);
      return true;
    },
  );
});
