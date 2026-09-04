import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createErrorState,
  createLoadingState,
  createSuccessState,
} from '../src/core/request-state.js';

test('creates a minimal loading state', () => {
  assert.deepEqual(createLoadingState('id-1', 'hello', 'gemini'), {
    status: 'loading',
    requestId: 'id-1',
    selectedText: 'hello',
    provider: 'gemini',
  });
});

test('creates a success state from a loading state', () => {
  const loading = createLoadingState('id-1', 'hello', 'openai');
  assert.deepEqual(createSuccessState(loading, 'Hello.'), {
    ...loading,
    status: 'success',
    result: 'Hello.',
  });
});

test('creates an error state without copying unrelated error fields', () => {
  const loading = createLoadingState('id-1', 'hello', 'openai');
  const error = new Error('Request failed.');
  error.retryable = true;
  error.configuration = false;
  error.apiKey = 'must-not-leak';

  const state = createErrorState(loading, error);

  assert.deepEqual(state, {
    ...loading,
    status: 'error',
    error: {
      message: 'Request failed.',
      retryable: true,
      configuration: false,
    },
  });
  assert.equal(JSON.stringify(state).includes('must-not-leak'), false);
});
