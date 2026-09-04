const PROVIDER_NAMES = {
  openai: 'OpenAI',
  gemini: 'Gemini',
};

function safeError(message, { invalidKey = false, retryable = false } = {}) {
  return {
    ok: false,
    error: {
      message,
      invalidKey,
      retryable,
    },
  };
}

export async function handleModelDiscovery(message, { providers }) {
  const provider = message?.provider;
  const providerName = PROVIDER_NAMES[provider];

  if (!providerName || typeof providers?.[provider] !== 'function') {
    return safeError('Choose OpenAI or Gemini before loading models.');
  }

  const apiKey = typeof message?.apiKey === 'string' ? message.apiKey.trim() : '';
  if (!apiKey) {
    return safeError(`Enter an ${providerName} API key first.`);
  }

  try {
    const models = await providers[provider]({ apiKey });
    return { ok: true, models };
  } catch (error) {
    if (error?.name === 'ProviderError') {
      return safeError(error.message, {
        invalidKey: error.invalidKey === true,
        retryable: error.retryable === true,
      });
    }

    return safeError(`Could not load ${providerName} models. Try again.`, {
      retryable: true,
    });
  }
}
