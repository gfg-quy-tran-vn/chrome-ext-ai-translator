import { buildPrompt } from './core/prompt.js';
import {
  createErrorState,
  createLoadingState,
  createSuccessState,
} from './core/request-state.js';
import {
  createDefaultSettings,
  getActiveProviderConfig,
  validateSettings,
} from './core/settings.js';

export async function runRewrite(selectedText, dependencies) {
  const {
    loadSettings,
    saveState,
    makeRequestId,
    providers,
  } = dependencies;

  const settings = createDefaultSettings(await loadSettings());
  const cleanText = selectedText?.trim() ?? '';
  const loadingState = createLoadingState(
    makeRequestId(),
    cleanText,
    settings.provider,
  );

  await saveState(loadingState);

  try {
    const validation = validateSettings(settings);
    if (!validation.valid) {
      const error = new Error(validation.message);
      error.configuration = validation.configuration;
      throw error;
    }

    const config = getActiveProviderConfig(settings);
    const provider = providers[config.provider];
    if (typeof provider !== 'function') {
      throw new Error('The selected AI provider is not available.');
    }

    const result = await provider({
      apiKey: config.apiKey,
      model: config.model.trim(),
      prompt: buildPrompt(settings.prompt, cleanText),
    });
    const successState = createSuccessState(loadingState, result);
    await saveState(successState);
    return successState;
  } catch (error) {
    const errorState = createErrorState(loadingState, error);
    await saveState(errorState);
    return errorState;
  }
}
