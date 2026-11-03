import { createDefaultSettings, getActiveProviderModels } from '../core/settings.js';
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
  promptSelect: document.querySelector('#prompt-select'),
  modelSelect: document.querySelector('#model-select'),
  copyButton: document.querySelector('#copy-button'),
  retryButton: document.querySelector('#retry-button'),
  settingsButton: document.querySelector('#configuration-settings-button'),
};

const headerSettingsButton = document.querySelector('#header-settings-button');
const actionStatus = document.querySelector('#action-status');
let currentState = null;
let controlsSync = 0;
// Model chosen for the next rewrite. Panel-only — it never changes the saved
// default in Settings.
let selectedModel = '';

function update(state) {
  currentState = state ?? null;
  actionStatus.textContent = '';
  elements.retryButton.disabled = false;
  renderState(elements, currentState);
  if (currentState?.status) {
    void syncControls();
  }
}

async function loadSettings() {
  return createDefaultSettings(await chrome.storage.local.get());
}

async function syncControls() {
  const syncId = ++controlsSync;
  let settings;
  try {
    settings = await loadSettings();
  } catch {
    if (syncId === controlsSync) {
      actionStatus.textContent = 'Could not load prompts.';
    }
    return;
  }
  if (syncId !== controlsSync) {
    return;
  }

  populatePromptSelect(settings.prompts);
  populateModelSelect(settings);
}

function populatePromptSelect(prompts) {
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Choose a prompt';

  const options = prompts.map((prompt) => {
    const option = document.createElement('option');
    option.value = prompt.id;
    option.textContent = prompt.name;
    option.title = prompt.instruction;
    return option;
  });

  const select = elements.promptSelect;
  select.replaceChildren(placeholder, ...options);
  const promptId = currentState?.promptId ?? '';
  select.value = prompts.some((prompt) => prompt.id === promptId) ? promptId : '';
  select.disabled = currentState?.status === 'loading';
}

function populateModelSelect(settings) {
  const savedModel = settings.provider === 'openai'
    ? settings.openaiModel
    : settings.geminiModel;
  const models = getActiveProviderModels(settings).slice();
  if (savedModel && !models.includes(savedModel)) {
    models.unshift(savedModel);
  }

  const select = elements.modelSelect;

  if (models.length === 0) {
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Set a model in Settings';
    select.replaceChildren(placeholder);
    select.value = '';
    select.disabled = true;
    selectedModel = '';
    return;
  }

  const options = models.map((model) => {
    const option = document.createElement('option');
    option.value = model;
    option.textContent = model;
    return option;
  });
  select.replaceChildren(...options);

  const desired = selectedModel && models.includes(selectedModel)
    ? selectedModel
    : savedModel && models.includes(savedModel)
      ? savedModel
      : models[0];
  select.value = desired;
  selectedModel = desired;
  select.disabled = currentState?.status === 'loading';
}

async function runPrompt(promptId) {
  elements.promptSelect.disabled = true;
  actionStatus.textContent = 'Starting…';

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'run-rewrite',
      promptId,
      model: elements.modelSelect.value,
      selectedText: elements.selectedText.value,
    });
    if (!response?.ok) {
      throw new Error(response?.message || 'Could not run the prompt.');
    }
  } catch (error) {
    actionStatus.textContent = error?.message || 'Could not run the prompt.';
    elements.promptSelect.disabled = currentState?.status === 'loading';
  }
}

elements.promptSelect.addEventListener('change', () => {
  const promptId = elements.promptSelect.value;
  if (!promptId || promptId === currentState?.promptId) {
    return;
  }
  void runPrompt(promptId);
});

elements.modelSelect.addEventListener('change', () => {
  selectedModel = elements.modelSelect.value;
});

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
      model: elements.modelSelect.value,
      selectedText: elements.selectedText.value,
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
  if (areaName === 'session' && SESSION_STATE_KEY in changes) {
    update(changes[SESSION_STATE_KEY].newValue);
    return;
  }

  // Keep the pickers in sync when prompts or models are edited in Settings.
  const watchedKeys = ['prompts', 'provider', 'openaiModel', 'geminiModel', 'openaiModels', 'geminiModels'];
  if (areaName === 'local' && currentState?.status
    && watchedKeys.some((key) => key in changes)) {
    void syncControls();
  }
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
