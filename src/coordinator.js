import { buildPrompt } from './core/prompt.js';
import {
  createErrorState,
  createLoadingState,
  createSuccessState,
} from './core/request-state.js';
import {
  createDefaultSettings,
  findPrompt,
  getActiveProviderConfig,
  validateSettings,
} from './core/settings.js';

export async function runRewrite(selectedText, promptId, dependencies) {
  const {
    loadSettings,
    saveState,
    makeRequestId,
    providers,
  } = dependencies;

  const settings = createDefaultSettings(await loadSettings());
  const cleanText = selectedText?.trim() ?? '';
  const prompt = findPrompt(settings.prompts, promptId);
  const loadingState = {
    ...createLoadingState(makeRequestId(), cleanText, settings.provider),
    promptId,
    promptName: prompt?.name ?? '',
  };

  await saveState(loadingState);

  try {
    const validation = validateSettings(settings);
    if (!validation.valid) {
      const error = new Error(validation.message);
      error.configuration = validation.configuration;
      throw error;
    }

    if (!prompt) {
      throw new Error('That prompt was deleted. Select the text again to choose a prompt.');
    }

    const config = getActiveProviderConfig(settings);
    const provider = providers[config.provider];
    if (typeof provider !== 'function') {
      throw new Error('The selected AI provider is not available.');
    }

    const result = await provider({
      apiKey: config.apiKey,
      model: config.model.trim(),
      prompt: buildPrompt(prompt.instruction, cleanText),
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
