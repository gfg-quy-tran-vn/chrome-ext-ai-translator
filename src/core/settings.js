export const DEFAULT_PROMPT =
  'Rewrite the selected text as clear, well-structured English sentences.';

export const DEFAULT_PROMPT_ID = 'rewrite';

const DEFAULT_SETTINGS = Object.freeze({
  provider: 'openai',
  openaiApiKey: '',
  openaiModel: 'gpt-5-mini',
  geminiApiKey: '',
  geminiModel: 'gemini-2.5-flash',
});

const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS);

// Model lists discovered when validating a key in Settings. The side panel
// reads them to offer a per-request model picker without another API call.
const MODEL_LIST_KEYS = ['openaiModels', 'geminiModels'];

export function createDefaultSettings(stored = {}) {
  return {
    ...Object.fromEntries(
      SETTING_KEYS.map((key) => [
        key,
        typeof stored[key] === 'string' ? stored[key] : DEFAULT_SETTINGS[key],
      ]),
    ),
    ...Object.fromEntries(
      MODEL_LIST_KEYS.map((key) => [key, normalizeModelList(stored[key])]),
    ),
    prompts: normalizePrompts(stored.prompts, stored.prompt),
  };
}

function normalizeModelList(models) {
  if (!Array.isArray(models)) {
    return [];
  }
  return [...new Set(
    models
      .filter((model) => typeof model === 'string')
      .map((model) => model.trim())
      .filter(Boolean),
  )];
}

// Each prompt is { id, name, instruction }. A legacy single `prompt` string
// becomes the one prompt named "Rewrite" when no prompt list is stored yet.
function normalizePrompts(storedPrompts, legacyInstruction) {
  if (Array.isArray(storedPrompts)) {
    const prompts = storedPrompts
      .filter(isStoredPrompt)
      .map(({ id, name, instruction }) => ({ id, name, instruction }));
    if (prompts.length > 0) {
      return prompts;
    }
  }

  const instruction = typeof legacyInstruction === 'string' && legacyInstruction.trim()
    ? legacyInstruction
    : DEFAULT_PROMPT;
  return [{ id: DEFAULT_PROMPT_ID, name: 'Rewrite', instruction }];
}

function isStoredPrompt(prompt) {
  return Boolean(prompt)
    && typeof prompt.id === 'string'
    && typeof prompt.name === 'string'
    && typeof prompt.instruction === 'string';
}

export function findPrompt(prompts, id) {
  return prompts.find((prompt) => prompt.id === id) ?? null;
}

export function validatePrompts(prompts) {
  if (prompts.length === 0) {
    return { valid: false, message: 'Add at least one prompt.' };
  }

  const names = new Set();
  for (const prompt of prompts) {
    const name = prompt.name.trim();
    if (!name) {
      return { valid: false, message: 'Every prompt needs a name.' };
    }
    if (!prompt.instruction.trim()) {
      return { valid: false, message: `Add an instruction for "${name}".` };
    }
    const key = name.toLowerCase();
    if (names.has(key)) {
      return { valid: false, message: `Prompt names must be unique: "${name}".` };
    }
    names.add(key);
  }

  return { valid: true };
}

export function getActiveProviderConfig(settings) {
  if (settings.provider === 'openai') {
    return {
      provider: 'openai',
      apiKey: settings.openaiApiKey,
      model: settings.openaiModel,
    };
  }

  if (settings.provider === 'gemini') {
    return {
      provider: 'gemini',
      apiKey: settings.geminiApiKey,
      model: settings.geminiModel,
    };
  }

  return null;
}

export function getActiveProviderModels(settings) {
  if (settings.provider === 'openai') {
    return settings.openaiModels ?? [];
  }
  if (settings.provider === 'gemini') {
    return settings.geminiModels ?? [];
  }
  return [];
}

export function validateSettings(settings) {
  const config = getActiveProviderConfig(settings);
  if (!config) {
    return configurationError('Choose OpenAI or Gemini in Settings.');
  }

  const providerName = config.provider === 'openai' ? 'OpenAI' : 'Gemini';
  if (!config.apiKey.trim()) {
    return configurationError(`Add your ${providerName} API key in Settings.`);
  }

  if (!config.model.trim()) {
    return configurationError(`Add a ${providerName} model in Settings.`);
  }

  return { valid: true };
}

function configurationError(message) {
  return { valid: false, message, configuration: true };
}
