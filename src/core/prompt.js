import { DEFAULT_PROMPT } from './settings.js';

export function buildPrompt(customPrompt, selectedText) {
  const text = selectedText?.trim() ?? '';
  if (!text) {
    throw new Error('Select some text before using Rewrite with AI.');
  }

  const instruction = customPrompt?.trim() || DEFAULT_PROMPT;
  return `${instruction}\n\nSelected text:\n---\n${text}\n---`;
}
