import {
  ProviderError,
  httpProviderError,
  networkProviderError,
} from './provider-error.js';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const OPENAI_MODELS_URL = 'https://api.openai.com/v1/models';

export async function callOpenAI({ apiKey, model, prompt, fetchImpl = fetch }) {
  try {
    const response = await fetchImpl(OPENAI_RESPONSES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, input: prompt }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      throw httpProviderError('OpenAI', response.status);
    }

    const data = await response.json();
    const text = (data.output ?? [])
      .flatMap((item) => item.content ?? [])
      .filter((part) => part.type === 'output_text' && typeof part.text === 'string')
      .map((part) => part.text.trim())
      .filter(Boolean)
      .join('\n');

    if (!text) {
      throw new ProviderError('OpenAI returned no text.', { retryable: true });
    }

    return text;
  } catch (error) {
    if (error instanceof ProviderError) {
      throw error;
    }
    throw networkProviderError('OpenAI', error);
  }
}

export async function listOpenAIModels({ apiKey, fetchImpl = fetch }) {
  try {
    const response = await fetchImpl(OPENAI_MODELS_URL, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      throw httpProviderError('OpenAI', response.status);
    }

    const data = await response.json();
    const models = [...new Set(
      (data.data ?? [])
        .map((model) => typeof model.id === 'string' ? model.id.trim() : '')
        .filter(Boolean),
    )].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

    if (models.length === 0) {
      throw new ProviderError('OpenAI returned no available models.', {
        retryable: true,
      });
    }

    return models;
  } catch (error) {
    if (error instanceof ProviderError) {
      throw error;
    }
    throw networkProviderError('OpenAI', error);
  }
}
