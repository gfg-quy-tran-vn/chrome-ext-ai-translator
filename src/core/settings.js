export const DEFAULT_PROMPT =
  'Rewrite the selected text as clear, well-structured English sentences.';

const DEFAULT_SETTINGS = Object.freeze({
  provider: 'openai',
  openaiApiKey: '',
  openaiModel: 'gpt-5-mini',
  geminiApiKey: '',
  geminiModel: 'gemini-2.5-flash',
  prompt: DEFAULT_PROMPT,
});

const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS);

export function createDefaultSettings(stored = {}) {
  return Object.fromEntries(
    SETTING_KEYS.map((key) => [
      key,
      typeof stored[key] === 'string' ? stored[key] : DEFAULT_SETTINGS[key],
    ]),
  );
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
