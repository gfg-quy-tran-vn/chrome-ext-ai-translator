import { renderMarkdown } from './markdown.js';

export function renderState(elements, state) {
  const hasRequest = Boolean(state?.status);
  elements.emptyView.hidden = hasRequest;
  elements.requestView.hidden = !hasRequest;

  if (!hasRequest) {
    elements.loadingView.hidden = true;
    elements.responseView.hidden = true;
    elements.errorView.hidden = true;
    elements.copyButton.hidden = true;
    elements.retryButton.hidden = true;
    elements.settingsButton.hidden = true;
    return;
  }

  elements.selectedText.textContent = state.selectedText ?? '';
  elements.providerLabel.textContent = providerName(state.provider);

  const isChoosing = state.status === 'choose';
  const isLoading = state.status === 'loading';
  const isSuccess = state.status === 'success';
  const isError = state.status === 'error';
  const configurationError = Boolean(state.error?.configuration);
  const canRetry = isSuccess || (isError && (
    state.error?.retryable || configurationError
  ));

  elements.promptSelect.disabled = isLoading;
  elements.loadingView.hidden = !isLoading;
  elements.responseView.hidden = !isSuccess;
  elements.errorView.hidden = !isError;
  elements.copyButton.hidden = !isSuccess;
  elements.retryButton.hidden = !canRetry;
  elements.settingsButton.hidden = !configurationError;

  elements.statusLabel.textContent = isChoosing
    ? 'Choose a prompt'
    : isLoading
      ? `Rewriting${state.promptName ? ` with “${state.promptName}”` : ''}…`
      : isSuccess
        ? 'Ready'
        : 'Error';
  elements.result.innerHTML = isSuccess ? renderMarkdown(state.result) : '';
  elements.errorMessage.textContent = isError
    ? state.error?.message ?? 'An unexpected error occurred.'
    : '';
}

function providerName(provider) {
  if (provider === 'openai') {
    return 'OpenAI';
  }
  if (provider === 'gemini') {
    return 'Gemini';
  }
  return 'AI';
}
