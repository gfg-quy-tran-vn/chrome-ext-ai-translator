import {
  createDefaultSettings,
  validateSettings,
} from '../core/settings.js';
import {
  canSaveModelState,
  createModelState,
  editKey,
  selectModel,
  startValidation,
  validationFailed,
  validationSucceeded,
} from './model-state.js';

const form = document.querySelector('#settings-form');
const openaiFields = document.querySelector('#openai-fields');
const geminiFields = document.querySelector('#gemini-fields');
const forgetKeysButton = document.querySelector('#forget-keys');
const saveSettingsButton = document.querySelector('#save-settings');
const status = document.querySelector('#status');

const providerControls = {
  openai: {
    key: document.querySelector('#openai-api-key'),
    model: document.querySelector('#openai-model'),
    validate: document.querySelector('#validate-openai'),
    status: document.querySelector('#openai-model-status'),
  },
  gemini: {
    key: document.querySelector('#gemini-api-key'),
    model: document.querySelector('#gemini-model'),
    validate: document.querySelector('#validate-gemini'),
    status: document.querySelector('#gemini-model-status'),
  },
};

let modelStates = {
  openai: createModelState(),
  gemini: createModelState(),
};

function selectedProvider() {
  return new FormData(form).get('provider');
}

function renderProviderFields() {
  const provider = selectedProvider();
  openaiFields.hidden = provider !== 'openai';
  geminiFields.hidden = provider !== 'gemini';
}

function statusKind(state) {
  if (state.validation === 'valid') {
    return 'success';
  }
  if (state.validation === 'invalid') {
    return 'invalid';
  }
  if (state.validation === 'error') {
    return 'error';
  }
  return 'info';
}

function renderModelState(provider) {
  const state = modelStates[provider];
  const controls = providerControls[provider];
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = state.models.length
    ? 'Choose a model'
    : 'Validate the API key to load models';

  const options = state.models.map((model) => {
    const option = document.createElement('option');
    option.value = model;
    option.textContent = model;
    return option;
  });

  controls.model.replaceChildren(placeholder, ...options);
  controls.model.value = state.selectedModel;
  controls.model.disabled = state.loading || state.models.length === 0;
  controls.validate.disabled = state.loading || !state.key;
  controls.validate.textContent = state.loading
    ? 'Loading models…'
    : 'Validate key & load models';
  controls.status.textContent = state.message;
  controls.status.dataset.kind = statusKind(state);
}

function renderSaveState() {
  const provider = selectedProvider();
  const anyLoading = Object.values(modelStates).some((state) => state.loading);
  saveSettingsButton.disabled = anyLoading || !canSaveModelState(modelStates[provider]);
}

function renderModelStates() {
  renderModelState('openai');
  renderModelState('gemini');
  renderSaveState();
}

function renderSettings(settings) {
  form.elements.provider.value = settings.provider;
  providerControls.openai.key.value = settings.openaiApiKey;
  providerControls.gemini.key.value = settings.geminiApiKey;
  form.elements.prompt.value = settings.prompt;
  modelStates = {
    openai: createModelState({
      savedKey: settings.openaiApiKey,
      savedModel: settings.openaiModel,
    }),
    gemini: createModelState({
      savedKey: settings.geminiApiKey,
      savedModel: settings.geminiModel,
    }),
  };
  renderProviderFields();
  renderModelStates();
}

function providerConfigurationForSave(provider) {
  const state = modelStates[provider];
  const mayUseCurrent = state.key === state.savedKey || state.validation === 'valid';
  return {
    apiKey: mayUseCurrent ? state.key : state.savedKey,
    model: mayUseCurrent ? state.selectedModel : state.savedModel,
  };
}

function readSettings() {
  const openai = providerConfigurationForSave('openai');
  const gemini = providerConfigurationForSave('gemini');

  return createDefaultSettings({
    provider: selectedProvider(),
    openaiApiKey: openai.apiKey,
    openaiModel: openai.model,
    geminiApiKey: gemini.apiKey,
    geminiModel: gemini.model,
    prompt: form.elements.prompt.value.trim(),
  });
}

function showStatus(message, kind = 'success') {
  status.textContent = message;
  status.dataset.kind = kind;
}

form.addEventListener('change', (event) => {
  if (event.target.name === 'provider') {
    renderProviderFields();
    renderSaveState();
    showStatus('');
  }
});

for (const provider of ['openai', 'gemini']) {
  const controls = providerControls[provider];

  controls.key.addEventListener('input', () => {
    modelStates[provider] = editKey(modelStates[provider], controls.key.value);
    renderModelState(provider);
    renderSaveState();
    showStatus('');
  });

  controls.model.addEventListener('change', () => {
    modelStates[provider] = selectModel(modelStates[provider], controls.model.value);
    renderSaveState();
    showStatus('');
  });

  controls.validate.addEventListener('click', async () => {
    const requestedKey = modelStates[provider].key;
    modelStates[provider] = startValidation(modelStates[provider]);
    renderModelState(provider);
    renderSaveState();
    showStatus('');

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'list-provider-models',
        provider,
        apiKey: requestedKey,
      });

      if (modelStates[provider].key !== requestedKey) {
        return;
      }

      modelStates[provider] = response?.ok
        ? validationSucceeded(modelStates[provider], response.models)
        : validationFailed(modelStates[provider], response?.error);
    } catch {
      if (modelStates[provider].key !== requestedKey) {
        return;
      }

      modelStates[provider] = validationFailed(modelStates[provider], {
        message: 'Could not load models. Try again.',
      });
    }

    renderModelState(provider);
    renderSaveState();
  });
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const settings = readSettings();
  const validation = validateSettings(settings);
  if (!validation.valid) {
    showStatus(validation.message, 'error');
    return;
  }

  try {
    await chrome.storage.local.set(settings);
    renderSettings(settings);
    showStatus('Settings saved.');
  } catch {
    showStatus('Could not save settings.', 'error');
  }
});

forgetKeysButton.addEventListener('click', async () => {
  const defaults = createDefaultSettings();
  const settings = createDefaultSettings({
    provider: selectedProvider(),
    openaiApiKey: '',
    openaiModel: defaults.openaiModel,
    geminiApiKey: '',
    geminiModel: defaults.geminiModel,
    prompt: form.elements.prompt.value.trim(),
  });

  try {
    await chrome.storage.local.set(settings);
    renderSettings(settings);
    showStatus('Both API keys were removed.');
  } catch {
    showStatus('Could not remove the API keys.', 'error');
  }
});

async function initialize() {
  try {
    const stored = await chrome.storage.local.get();
    renderSettings(createDefaultSettings(stored));
  } catch {
    renderSettings(createDefaultSettings());
    showStatus('Could not load saved settings.', 'error');
  }
}

void initialize();
