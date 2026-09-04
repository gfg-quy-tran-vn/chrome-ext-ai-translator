import {
  createDefaultSettings,
  validateSettings,
} from '../core/settings.js';

const form = document.querySelector('#settings-form');
const openaiFields = document.querySelector('#openai-fields');
const geminiFields = document.querySelector('#gemini-fields');
const forgetKeysButton = document.querySelector('#forget-keys');
const status = document.querySelector('#status');

function selectedProvider() {
  return new FormData(form).get('provider');
}

function renderProviderFields() {
  const provider = selectedProvider();
  openaiFields.hidden = provider !== 'openai';
  geminiFields.hidden = provider !== 'gemini';
}

function renderSettings(settings) {
  form.elements.provider.value = settings.provider;
  form.elements.openaiApiKey.value = settings.openaiApiKey;
  form.elements.openaiModel.value = settings.openaiModel;
  form.elements.geminiApiKey.value = settings.geminiApiKey;
  form.elements.geminiModel.value = settings.geminiModel;
  form.elements.prompt.value = settings.prompt;
  renderProviderFields();
}

function readSettings() {
  return createDefaultSettings({
    provider: selectedProvider(),
    openaiApiKey: form.elements.openaiApiKey.value.trim(),
    openaiModel: form.elements.openaiModel.value.trim(),
    geminiApiKey: form.elements.geminiApiKey.value.trim(),
    geminiModel: form.elements.geminiModel.value.trim(),
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
    showStatus('');
  }
});

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
    showStatus('Settings saved.');
  } catch {
    showStatus('Could not save settings.', 'error');
  }
});

forgetKeysButton.addEventListener('click', async () => {
  const settings = readSettings();
  settings.openaiApiKey = '';
  settings.geminiApiKey = '';

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
