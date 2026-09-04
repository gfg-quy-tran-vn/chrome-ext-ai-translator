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

export async function listGeminiModels({ apiKey, fetchImpl = fetch }) {
  const modelIds = [];
  let pageToken = '';

  try {
    do {
      const url = pageToken
        ? `${GEMINI_API_ROOT}?pageToken=${encodeURIComponent(pageToken)}`
        : GEMINI_API_ROOT;
      const response = await fetchImpl(url, {
        method: 'GET',
        headers: {
          'x-goog-api-key': apiKey,
        },
        signal: AbortSignal.timeout(60_000),
      });

      if (!response.ok) {
        throw httpProviderError('Gemini', response.status);
      }

      const data = await response.json();
      for (const model of data.models ?? []) {
        if (!model.supportedGenerationMethods?.includes('generateContent')) {
          continue;
        }
        const id = typeof model.name === 'string'
          ? model.name.replace(/^models\//, '').trim()
          : '';
        if (id) {
          modelIds.push(id);
        }
      }
      pageToken = typeof data.nextPageToken === 'string'
        ? data.nextPageToken.trim()
        : '';
    } while (pageToken);

    const models = [...new Set(modelIds)]
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

    if (models.length === 0) {
      throw new ProviderError(
        'Gemini returned no available generation models.',
        { retryable: true },
      );
    }

    return models;
  } catch (error) {
    if (error instanceof ProviderError) {
      throw error;
    }
    throw networkProviderError('Gemini', error);
  }
}
