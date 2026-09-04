import { renderState } from './render.js';

const SESSION_STATE_KEY = 'rewriteRequestState';

const elements = {
  emptyView: document.querySelector('#empty-view'),
  requestView: document.querySelector('#request-view'),
  loadingView: document.querySelector('#loading-view'),
  responseView: document.querySelector('#response-view'),
  errorView: document.querySelector('#error-view'),
  selectedText: document.querySelector('#selected-text'),
  providerLabel: document.querySelector('#provider-label'),
  statusLabel: document.querySelector('#status-label'),
  result: document.querySelector('#result'),
  errorMessage: document.querySelector('#error-message'),
  copyButton: document.querySelector('#copy-button'),
  retryButton: document.querySelector('#retry-button'),
  settingsButton: document.querySelector('#configuration-settings-button'),
};

const headerSettingsButton = document.querySelector('#header-settings-button');
const actionStatus = document.querySelector('#action-status');
let currentState = null;

function update(state) {
  currentState = state ?? null;
  actionStatus.textContent = '';
  elements.retryButton.disabled = false;
  renderState(elements, currentState);
}

async function openSettings() {
  await chrome.runtime.openOptionsPage();
}

headerSettingsButton.addEventListener('click', () => {
  void openSettings();
});

elements.settingsButton.addEventListener('click', () => {
  void openSettings();
});

elements.copyButton.addEventListener('click', async () => {
  if (currentState?.status !== 'success') {
    return;
  }

  try {
    await navigator.clipboard.writeText(currentState.result);
    actionStatus.textContent = 'Response copied.';
  } catch {
    actionStatus.textContent = 'Could not copy the response.';
  }
});

elements.retryButton.addEventListener('click', async () => {
  elements.retryButton.disabled = true;
  actionStatus.textContent = 'Retrying…';

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'retry-last-request',
    });
    if (!response?.ok) {
      throw new Error(response?.message || 'Retry failed.');
    }
  } catch (error) {
    actionStatus.textContent = error?.message || 'Retry failed.';
    elements.retryButton.disabled = false;
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'session' || !(SESSION_STATE_KEY in changes)) {
    return;
  }
  update(changes[SESSION_STATE_KEY].newValue);
});

async function initialize() {
  try {
    const stored = await chrome.storage.session.get(SESSION_STATE_KEY);
    update(stored[SESSION_STATE_KEY]);
  } catch {
    update(null);
    actionStatus.textContent = 'Could not load the last response.';
  }
}

void initialize();
