import test from 'node:test';
import assert from 'node:assert/strict';

import { renderState } from '../src/sidepanel/render.js';

function element() {
  return {
    hidden: false,
    textContent: '',
    innerHTML: '',
    value: '',
    disabled: false,
    readOnly: false,
  };
}

function createElements() {
  return {
    emptyView: element(),
    requestView: element(),
    promptSelect: element(),
    modelSelect: element(),
    loadingView: element(),
    responseView: element(),
    errorView: element(),
    selectedText: element(),
    providerLabel: element(),
    statusLabel: element(),
    result: element(),
    errorMessage: element(),
    copyButton: element(),
    retryButton: element(),
    settingsButton: element(),
  };
}

test('renders the empty guidance view without request controls', () => {
  const elements = createElements();

  renderState(elements, null);

  assert.equal(elements.emptyView.hidden, false);
  assert.equal(elements.requestView.hidden, true);
  assert.equal(elements.copyButton.hidden, true);
  assert.equal(elements.retryButton.hidden, true);
  assert.equal(elements.settingsButton.hidden, true);
});

test('shows the prompt picker for a selection waiting for a prompt', () => {
  const elements = createElements();

  renderState(elements, {
    status: 'choose',
    selectedText: 'rough words',
  });

  assert.equal(elements.requestView.hidden, false);
  assert.equal(elements.promptSelect.disabled, false);
  assert.equal(elements.loadingView.hidden, true);
  assert.equal(elements.responseView.hidden, true);
  assert.equal(elements.errorView.hidden, true);
  assert.equal(elements.retryButton.hidden, true);
  assert.equal(elements.statusLabel.textContent, 'Choose a prompt');
});

test('names the prompt in the loading status', () => {
  const elements = createElements();

  renderState(elements, {
    status: 'loading',
    selectedText: 'rough words',
    provider: 'openai',
    promptName: 'Formal',
  });

  assert.equal(elements.statusLabel.textContent, 'Rewriting with “Formal”…');
  assert.equal(elements.promptSelect.disabled, true);
});

test('renders a loading request', () => {
  const elements = createElements();

  renderState(elements, {
    status: 'loading',
    selectedText: 'rough words',
    provider: 'gemini',
  });

  assert.equal(elements.emptyView.hidden, true);
  assert.equal(elements.requestView.hidden, false);
  assert.equal(elements.loadingView.hidden, false);
  assert.equal(elements.responseView.hidden, true);
  assert.equal(elements.errorView.hidden, true);
  assert.equal(elements.selectedText.value, 'rough words');
  assert.equal(elements.providerLabel.textContent, 'Gemini');
  assert.equal(elements.statusLabel.textContent, 'Rewriting…');
});

test('renders markdown success content and keeps it XSS-safe', () => {
  const elements = createElements();
  const selectedText = '<img src=x onerror=alert(1)>';
  const result = '**Score: 88%**\n\n### Risks\n- one';

  renderState(elements, {
    status: 'success',
    selectedText,
    result,
    provider: 'openai',
  });

  assert.equal(elements.selectedText.value, selectedText);
  assert.equal(
    elements.result.innerHTML,
    '<p><strong>Score: 88%</strong></p><h3>Risks</h3><ul><li>one</li></ul>',
  );
  assert.equal(elements.providerLabel.textContent, 'OpenAI');
  assert.equal(elements.statusLabel.textContent, 'Ready');
  assert.equal(elements.responseView.hidden, false);
  assert.equal(elements.copyButton.hidden, false);
  assert.equal(elements.retryButton.hidden, false);
  assert.equal(elements.settingsButton.hidden, true);
});

test('escapes raw HTML embedded in a markdown response', () => {
  const elements = createElements();

  renderState(elements, {
    status: 'success',
    selectedText: 'hi',
    result: '<img src=x onerror=alert(1)>',
    provider: 'openai',
  });

  assert.ok(!elements.result.innerHTML.includes('<img'));
  assert.ok(elements.result.innerHTML.includes('&lt;img'));
});

test('renders retryable errors without showing configuration settings', () => {
  const elements = createElements();

  renderState(elements, {
    status: 'error',
    selectedText: 'rough words',
    provider: 'gemini',
    error: {
      message: 'Rate limit reached.',
      retryable: true,
      configuration: false,
    },
  });

  assert.equal(elements.errorView.hidden, false);
  assert.equal(elements.errorMessage.textContent, 'Rate limit reached.');
  assert.equal(elements.statusLabel.textContent, 'Error');
  assert.equal(elements.retryButton.hidden, false);
  assert.equal(elements.settingsButton.hidden, true);
});

test('renders settings and retry actions for configuration errors', () => {
  const elements = createElements();

  renderState(elements, {
    status: 'error',
    selectedText: 'rough words',
    provider: 'openai',
    error: {
      message: 'Add your OpenAI API key in Settings.',
      retryable: false,
      configuration: true,
    },
  });

  assert.equal(elements.retryButton.hidden, false);
  assert.equal(elements.settingsButton.hidden, false);
});
