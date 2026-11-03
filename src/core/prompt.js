import { DEFAULT_PROMPT } from './settings.js';

export function buildPrompt(instructionText, selectedText) {
  const text = selectedText?.trim() ?? '';
  if (!text) {
    throw new Error('Select some text before using Rewrite with AI.');
  }

  const instruction = instructionText?.trim() || DEFAULT_PROMPT;
  return `${instruction}\n\nSelected text:\n---\n${text}\n---`;
}
