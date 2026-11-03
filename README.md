# Rewrite with AI

A personal-use Chrome extension that rewrites selected webpage text with OpenAI or Gemini and shows the answer in Chrome's side panel.

## Requirements

- Chrome 116 or newer.
- An [OpenAI API key](https://platform.openai.com/api-keys) or a [Gemini API key](https://aistudio.google.com/app/apikey).

Provider API usage may incur charges on the account associated with the configured key.

## Install locally

1. Clone this repository:

   ```bash
   git clone https://github.com/QuyTran/chrome-ext-ai-translator.git
   ```

2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. In the folder picker, open the cloned `chrome-ext-ai-translator` directory and select it. Chrome loads an unpacked extension from the folder that contains `manifest.json` at its root — that file sits next to `README.md`, not inside `src/`.
6. Open the extension's **Details** page and select **Extension options**.

Chrome keeps the unpacked extension linked to this folder. After updating its files, use the refresh button on `chrome://extensions`.

## Configure

1. Choose **OpenAI** or **Gemini**.
2. Enter that provider's API key.
3. Keep the suggested model or enter another model available to your provider account.
4. Manage the **Prompts** list. Each prompt has a name and an instruction. A starter prompt named **Rewrite** uses this instruction:
  > Rewrite the selected text as clear, well-structured English sentences.

   Use **Add prompt** to create more, edit names and instructions, or **Delete prompt** to remove one. Names must be unique, and at least one prompt must remain.

   ![Settings page with provider, API key, model, and custom prompt](images/settings.png)

5. Click **Save settings**.

Both provider configurations remain in local Chrome extension storage, but only the selected provider is called. **Forget keys** removes both saved API keys while preserving the other settings.

## Use

1. Select text on a webpage.
2. Right-click the selection.

   ![Chrome context menu with Rewrite with AI highlighted](images/menu-context.png)

3. Choose **Rewrite with AI**
4. The Chrome side panel opens. Choose a prompt from the **Prompt** dropdown to rewrite the selection with that prompt's instruction.
5. The side panel shows progress, the selected text, and the provider response. To try another template, choose a different prompt from the same dropdown.

   ![Chrome side panel showing selected text and the provider response](images/left-panel.png)

6. Use **Copy response** to copy the result or **Retry** to repeat the last request with the same prompt and the current settings.

If the provider configuration is missing or rejected, choose **Open settings** from the error state, correct it, and retry.

## Privacy and API-key safety

- API keys are stored in `chrome.storage.local`, not synchronized storage.
- Storage access is restricted to trusted extension pages.
- The extension sends requests only to the official OpenAI and Gemini HTTPS API origins.
- The webpage and its scripts never receive an API key; no content script is used.
- Selected text and responses are kept only in `chrome.storage.session` and expire with the browser session.
- Output is rendered as text, never interpreted as webpage HTML.
- The extension has no analytics, telemetry, remote scripts, or runtime dependencies.

Local extension storage is not a hardware-backed secret vault. Malware or a person with access to the Chrome profile may still obtain locally stored keys. Use restricted provider keys where supported, monitor usage, and revoke a key if you suspect exposure.

## Develop and test

No dependency installation or build step is required.

```bash
node --test
```

Check JavaScript syntax:

```bash
find src tests -name '*.js' -print0 | xargs -0 -n1 node --check
```



## Manual verification checklist

- [ ] Chrome loads the unpacked extension without manifest or service-worker errors.
- [ ] The options page initially selects OpenAI and displays the default **Rewrite** prompt and models.
- [ ] Prompts can be added, renamed, edited, and deleted; the last prompt cannot be deleted, and duplicate names are rejected.
- [ ] Choosing a prompt from the side panel dropdown rewrites the selection with that prompt's instruction.
- [ ] Switching the dropdown reruns the same selection with the newly chosen prompt.
- [ ] The extension icon appears on the toolbar, in the side panel, and on `chrome://extensions`.
- [ ] OpenAI settings save and remain after closing and reopening the options page.
- [ ] Gemini settings save and remain after closing and reopening the options page.
- [ ] Switching providers displays the matching key and model while preserving the other provider's values.
- [ ] **Forget keys** clears both keys and keeps the provider, models, and prompt.
- [ ] The context-menu item appears when non-empty webpage text is selected.
- [ ] The context-menu item does not appear when no text is selected.
- [ ] Selecting the menu item immediately opens the side panel with the selected text and the prompt dropdown.
- [ ] A valid OpenAI configuration produces a response.
- [ ] A valid Gemini configuration produces a response.
- [ ] **Copy response** copies the complete plain-text result.
- [ ] **Retry** repeats the last selected text using the latest saved settings.
- [ ] Missing/invalid keys, invalid models, rate limits, and network failures show readable errors without secret values.
- [ ] Settings persist after restarting Chrome.
- [ ] Selected text and the response disappear after ending the browser session.