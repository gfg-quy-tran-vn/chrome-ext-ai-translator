import {
  ProviderError,
  httpProviderError,
  networkProviderError,
} from './provider-error.js';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';

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
