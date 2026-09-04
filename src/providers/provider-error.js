export class ProviderError extends Error {
  constructor(message, { retryable = false, configuration = false } = {}) {
    super(message);
    this.name = 'ProviderError';
    this.retryable = retryable;
    this.configuration = configuration;
  }
}

export function httpProviderError(provider, status) {
  if (status === 401 || status === 403) {
    return new ProviderError(
      `${provider} rejected the API key. Check it in Settings.`,
      { configuration: true },
    );
  }

  if (status === 400 || status === 404) {
    return new ProviderError(
      `${provider} rejected the request. Check the model in Settings.`,
      { configuration: true },
    );
  }

  if (status === 429) {
    return new ProviderError(
      `${provider} rate limit reached. Try again shortly.`,
      { retryable: true },
    );
  }

  return new ProviderError(
    `${provider} request failed (${status}). Try again.`,
    { retryable: status >= 500 },
  );
}

export function networkProviderError(provider, error) {
  if (error?.name === 'TimeoutError') {
    return new ProviderError(`${provider} request timed out. Try again.`, {
      retryable: true,
    });
  }

  return new ProviderError(
    `Could not reach ${provider}. Check your connection and try again.`,
    { retryable: true },
  );
}
