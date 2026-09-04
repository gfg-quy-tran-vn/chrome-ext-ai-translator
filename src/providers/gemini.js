import {
  ProviderError,
  httpProviderError,
  networkProviderError,
} from './provider-error.js';

const GEMINI_API_ROOT =
  'https://generativelanguage.googleapis.com/v1beta/models';

export async function callGemini({ apiKey, model, prompt, fetchImpl = fetch }) {
  const url = `${GEMINI_API_ROOT}/${encodeURIComponent(model)}:generateContent`;

  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      throw httpProviderError('Gemini', response.status);
    }

    const data = await response.json();
    const text = (data.candidates?.[0]?.content?.parts ?? [])
      .map((part) => typeof part.text === 'string' ? part.text.trim() : '')
      .filter(Boolean)
      .join('\n');

    if (!text) {
      throw new ProviderError('Gemini returned no text.', { retryable: true });
    }

    return text;
  } catch (error) {
    if (error instanceof ProviderError) {
      throw error;
    }
    throw networkProviderError('Gemini', error);
  }
}
