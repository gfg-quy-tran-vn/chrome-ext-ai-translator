export function createLoadingState(requestId, selectedText, provider) {
  return {
    status: 'loading',
    requestId,
    selectedText,
    provider,
  };
}

export function createSuccessState(loadingState, result) {
  return {
    ...loadingState,
    status: 'success',
    result,
  };
}

export function createErrorState(loadingState, error) {
  return {
    ...loadingState,
    status: 'error',
    error: {
      message: error?.message || 'An unexpected error occurred.',
      retryable: Boolean(error?.retryable),
      configuration: Boolean(error?.configuration),
    },
  };
}
