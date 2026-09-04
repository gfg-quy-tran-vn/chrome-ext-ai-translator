function normalizeModels(models) {
  return [...new Set(
    (Array.isArray(models) ? models : [])
      .filter((model) => typeof model === 'string')
      .map((model) => model.trim())
      .filter(Boolean),
  )].sort((left, right) => left.localeCompare(right));
}

export function createModelState({ savedKey = '', savedModel = '' } = {}) {
  const key = typeof savedKey === 'string' ? savedKey.trim() : '';
  const model = typeof savedModel === 'string' ? savedModel.trim() : '';
  const hasSavedConfiguration = Boolean(key && model);

  return {
    savedKey: key,
    savedModel: model,
    key,
    models: hasSavedConfiguration ? [model] : [],
    selectedModel: hasSavedConfiguration ? model : '',
    validation: hasSavedConfiguration ? 'saved' : 'required',
    message: hasSavedConfiguration
      ? 'Using the saved model. Validate the key to refresh this list.'
      : 'Enter an API key, then validate it to load models.',
    loading: false,
  };
}

export function editKey(state, nextKey) {
  const key = typeof nextKey === 'string' ? nextKey.trim() : '';
  if (key === state.savedKey && key && state.savedModel) {
    return {
      ...state,
      key,
      models: [state.savedModel],
      selectedModel: state.savedModel,
      validation: 'saved',
      message: 'Using the saved model. Validate the key to refresh this list.',
      loading: false,
    };
  }

  return {
    ...state,
    key,
    models: [],
    selectedModel: '',
    validation: 'required',
    message: key
      ? 'Validate this API key to load its available models.'
      : 'Enter an API key, then validate it to load models.',
    loading: false,
  };
}

export function startValidation(state) {
  return {
    ...state,
    validation: 'loading',
    message: 'Validating API key and loading models…',
    loading: true,
  };
}

export function validationSucceeded(state, models) {
  const normalizedModels = normalizeModels(models);
  let selectedModel = normalizedModels.includes(state.selectedModel)
    ? state.selectedModel
    : '';

  if (
    !selectedModel
    && state.key === state.savedKey
    && normalizedModels.includes(state.savedModel)
  ) {
    selectedModel = state.savedModel;
  }

  return {
    ...state,
    models: normalizedModels,
    selectedModel,
    validation: 'valid',
    message: normalizedModels.length
      ? `Loaded ${normalizedModels.length} model${normalizedModels.length === 1 ? '' : 's'}.`
      : 'No compatible models were returned for this API key.',
    loading: false,
  };
}

export function validationFailed(state, error = {}) {
  const invalidKey = error.invalidKey === true;

  return {
    ...state,
    models: invalidKey ? [] : state.models,
    selectedModel: invalidKey ? '' : state.selectedModel,
    validation: invalidKey ? 'invalid' : 'error',
    message: error.message || 'Could not load models. Try again.',
    loading: false,
  };
}

export function selectModel(state, model) {
  return {
    ...state,
    selectedModel: state.models.includes(model) ? model : '',
  };
}

export function canSaveModelState(state) {
  if (state.loading || !state.key || !state.selectedModel) {
    return false;
  }

  if (!state.models.includes(state.selectedModel)) {
    return false;
  }

  return state.key === state.savedKey || state.validation === 'valid';
}
