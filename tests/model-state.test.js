import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canSaveModelState,
  createModelState,
  editKey,
  selectModel,
  startValidation,
  validationFailed,
  validationSucceeded,
} from '../src/options/model-state.js';

test('loads a saved model as the only offline option', () => {
  const state = createModelState({
    savedKey: 'saved-key',
    savedModel: 'gpt-5-mini',
  });

  assert.deepEqual(state.models, ['gpt-5-mini']);
  assert.equal(state.selectedModel, 'gpt-5-mini');
  assert.equal(state.validation, 'saved');
  assert.equal(canSaveModelState(state), true);
});

test('starts empty when there is no saved key', () => {
  const state = createModelState({
    savedKey: '',
    savedModel: 'gpt-5-mini',
  });

  assert.deepEqual(state.models, []);
  assert.equal(state.selectedModel, '');
  assert.equal(state.validation, 'required');
  assert.equal(canSaveModelState(state), false);
});

test('changing a key clears models and requires validation', () => {
  const initial = createModelState({
    savedKey: 'old-key',
    savedModel: 'gpt-5-mini',
  });
  const state = editKey(initial, 'new-key');

  assert.deepEqual(state.models, []);
  assert.equal(state.selectedModel, '');
  assert.equal(state.validation, 'required');
  assert.equal(canSaveModelState(state), false);
});

test('reverting to the saved key restores its saved model', () => {
  const initial = createModelState({
    savedKey: 'old-key',
    savedModel: 'gpt-5-mini',
  });
  const changed = editKey(initial, 'new-key');
  const reverted = editKey(changed, 'old-key');

  assert.deepEqual(reverted.models, ['gpt-5-mini']);
  assert.equal(reverted.selectedModel, 'gpt-5-mini');
  assert.equal(reverted.validation, 'saved');
  assert.equal(canSaveModelState(reverted), true);
});

test('successful validation normalizes models and selects a saved match', () => {
  const initial = createModelState({
    savedKey: 'saved-key',
    savedModel: 'gpt-5-mini',
  });
  const loading = startValidation(initial);
  const state = validationSucceeded(loading, [
    'gpt-5',
    'gpt-5-mini',
    ' gpt-5 ',
    '',
  ]);

  assert.deepEqual(state.models, ['gpt-5', 'gpt-5-mini']);
  assert.equal(state.selectedModel, 'gpt-5-mini');
  assert.equal(state.validation, 'valid');
  assert.equal(state.loading, false);
  assert.equal(canSaveModelState(state), true);
});

test('successful validation of a changed key requires choosing a model', () => {
  const initial = createModelState({
    savedKey: 'old-key',
    savedModel: 'gpt-5-mini',
  });
  const changed = editKey(initial, 'new-key');
  const state = validationSucceeded(startValidation(changed), ['gpt-5', 'gpt-5-mini']);

  assert.equal(state.selectedModel, '');
  assert.equal(canSaveModelState(state), false);

  const selected = selectModel(state, 'gpt-5');
  assert.equal(selected.selectedModel, 'gpt-5');
  assert.equal(canSaveModelState(selected), true);
});

test('invalid credentials clear models and show the invalid-key state', () => {
  const validated = validationSucceeded(
    startValidation(createModelState({ savedKey: '', savedModel: '' })),
    ['gemini-2.5-flash'],
  );
  const state = validationFailed(validated, {
    message: 'Gemini rejected the API key.',
    invalidKey: true,
  });

  assert.deepEqual(state.models, []);
  assert.equal(state.selectedModel, '');
  assert.equal(state.validation, 'invalid');
  assert.equal(state.message, 'Gemini rejected the API key.');
  assert.equal(canSaveModelState(state), false);
});

test('transient validation failures preserve the saved offline option', () => {
  const initial = createModelState({
    savedKey: 'saved-key',
    savedModel: 'gpt-5-mini',
  });
  const state = validationFailed(startValidation(initial), {
    message: 'Could not reach OpenAI.',
    invalidKey: false,
  });

  assert.deepEqual(state.models, ['gpt-5-mini']);
  assert.equal(state.selectedModel, 'gpt-5-mini');
  assert.equal(state.validation, 'error');
  assert.equal(canSaveModelState(state), true);
});

test('an empty successful response remains unsavable', () => {
  const initial = editKey(
    createModelState({ savedKey: 'old', savedModel: 'old-model' }),
    'new',
  );
  const state = validationSucceeded(startValidation(initial), []);

  assert.deepEqual(state.models, []);
  assert.equal(state.selectedModel, '');
  assert.equal(canSaveModelState(state), false);
});
