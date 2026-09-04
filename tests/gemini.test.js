import test from 'node:test';
import assert from 'node:assert/strict';

import { callGemini } from '../src/providers/gemini.js';
import { ProviderError } from '../src/providers/provider-error.js';

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

test('calls Gemini generateContent with the key in a header', async () => {
  const fetchImpl = async (url, options) => {
    assert.equal(
      url,
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent',
    );
    assert.equal(url.includes('test-key'), false);
    assert.equal(options.method, 'POST');
    assert.equal(options.headers['x-goog-api-key'], 'test-key');
    assert.equal(options.headers['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(options.body), {
      contents: [{ parts: [{ text: 'rewrite me' }] }],
    });
    return jsonResponse({
      candidates: [{
        content: { parts: [{ text: 'First.' }, { text: 'Second.' }] },
      }],
    });
  };

  const result = await callGemini({
    apiKey: 'test-key',
    model: 'gemini-test',
    prompt: 'rewrite me',
    fetchImpl,
  });

  assert.equal(result, 'First.\nSecond.');
});

test('URL-encodes the configured Gemini model', async () => {
  const fetchImpl = async (url) => {
    assert.equal(url.endsWith('/models/family%2Fmodel:generateContent'), true);
    return jsonResponse({
      candidates: [{ content: { parts: [{ text: 'Done.' }] } }],
    });
  };

  assert.equal(await callGemini({
    apiKey: 'key', model: 'family/model', prompt: 'rewrite', fetchImpl,
  }), 'Done.');
});

test('normalizes rejected Gemini credentials', async () => {
  await assert.rejects(
    callGemini({
      apiKey: 'secret-that-must-not-leak',
      model: 'gemini-test',
      prompt: 'rewrite',
      fetchImpl: async () => jsonResponse({}, 403),
    }),
    (error) => {
      assert.ok(error instanceof ProviderError);
      assert.equal(error.message, 'Gemini rejected the API key. Check it in Settings.');
      assert.equal(error.configuration, true);
      assert.equal(error.retryable, false);
      assert.equal(error.message.includes('secret-that-must-not-leak'), false);
      return true;
    },
  );
});

test('marks Gemini rate limits as retryable', async () => {
  await assert.rejects(
    callGemini({
      apiKey: 'secret', model: 'gemini-test', prompt: 'rewrite',
      fetchImpl: async () => jsonResponse({}, 429),
    }),
    (error) => {
      assert.equal(error.message, 'Gemini rate limit reached. Try again shortly.');
      assert.equal(error.retryable, true);
      assert.equal(error.configuration, false);
      return true;
    },
  );
});

test('rejects a Gemini response with no usable text', async () => {
  await assert.rejects(
    callGemini({
      apiKey: 'secret', model: 'gemini-test', prompt: 'rewrite',
      fetchImpl: async () => jsonResponse({ candidates: [] }),
    }),
    (error) => {
      assert.equal(error.message, 'Gemini returned no text.');
      assert.equal(error.retryable, true);
      return true;
    },
  );
});

test('normalizes Gemini network failures', async () => {
  await assert.rejects(
    callGemini({
      apiKey: 'secret', model: 'gemini-test', prompt: 'rewrite',
      fetchImpl: async () => { throw new TypeError('network details'); },
    }),
    (error) => {
      assert.equal(error.message, 'Could not reach Gemini. Check your connection and try again.');
      assert.equal(error.retryable, true);
      return true;
    },
  );
});
