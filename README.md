# Rewrite with AI

Rewrite selected webpage text with OpenAI or Gemini. The result appears in Chrome's side panel, where you can read it, copy it, or retry the request.

This extension is intended for personal use and runs without a separate server.

## What you need

- Chrome 116 or newer.
- An [OpenAI API key](https://platform.openai.com/api-keys) or a [Gemini API key](https://aistudio.google.com/app/apikey).

Requests made with these keys may incur charges from the selected provider.

## 1. Install the extension

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode** in the top-right corner.
3. Click **Load unpacked**.
4. Select this project folder—the folder that contains `manifest.json`.
5. Find **Rewrite with AI** in the extensions list.
6. Click **Details**, then click **Extension options** to open Settings.

Chrome keeps the unpacked extension connected to the selected folder. After the source files change, return to `chrome://extensions` and click the extension's reload button.

## 2. Configure a provider

1. In Settings, choose **OpenAI** or **Gemini**.
2. Enter the API key for that provider.
3. Click **Validate key & load models**.
4. Wait for the model dropdown to appear, then choose a model.
5. Keep the default rewrite instruction or enter your own custom prompt.
6. Click **Save settings**.

The default instruction is:

> Rewrite the selected text as clear, well-structured English sentences.

The **Save settings** button remains disabled until the active provider has a validated key and a selected model. If a previously saved key is unchanged, its saved model remains available even while you are offline.

### Understanding model validation

- A valid OpenAI key loads the models available to that key.
- A valid Gemini key loads models that support text generation.
- An invalid key displays an error and leaves the model dropdown empty.
- A temporary network or provider error is shown separately from an invalid-key error. You can retry validation without re-entering the key.
- Changing a saved key clears its model list. Validate the new key before saving it.

## 3. Rewrite selected text

1. Select non-empty text on a webpage.
2. Right-click the selection.
3. Choose **Rewrite with AI**.
4. Chrome opens the side panel and shows the request progress.
5. Read the rewritten response when it appears.

Use **Copy response** to copy the complete result. Use **Retry** to send the same selected text again with the latest saved settings.

## Switch between OpenAI and Gemini

1. Open the extension's Settings page.
2. Choose the provider you want to use.
3. Configure and validate that provider if you have not already done so.
4. Select a model and click **Save settings**.

The extension can keep both provider configurations locally, but it sends each rewrite request only to the currently selected provider.

## Change the rewrite instruction

The custom prompt controls what the AI does with selected text. For example:

- `Rewrite the selected text as concise, professional English.`
- `Correct the grammar while preserving the original tone.`
- `Rewrite this for a non-technical audience.`

You only need to enter the instruction. The extension appends the selected webpage text automatically.

## Remove saved API keys

Open Settings and click **Forget keys**. This removes both provider keys from extension storage and disables the model dropdowns until a key is entered and validated again. Your selected provider and custom prompt remain unchanged.

## Troubleshooting

### The model dropdown is empty

Enter an API key and click **Validate key & load models**. If the key is invalid, correct it and validate again. If the message reports a connection or provider problem, wait briefly and retry.

### The selected model is rejected

Return to Settings, validate the key again, and choose another text-generation model from the refreshed list.

### The right-click menu does not appear

Make sure you selected non-empty text. Then check that **Rewrite with AI** is enabled on `chrome://extensions`. Reload the extension if its files were recently updated.

### The side panel shows a configuration error

Click **Open settings** in the error view. Confirm the active provider, validate its key, select a model, save, and then use **Retry**.

### Settings do not save

The active provider must have a valid key and a selected model. Wait for any model-loading request to finish before clicking **Save settings**.

## Privacy and API-key safety

- API keys are stored in `chrome.storage.local`, not synchronized storage.
- Storage access is restricted to trusted extension pages.
- The extension sends requests only to the official OpenAI and Gemini HTTPS API origins.
- Model discovery runs in the trusted background worker. Webpages never receive API keys or model-list responses.
- The extension does not inject a content script into webpages.
- Selected text and responses use `chrome.storage.session` and expire with the browser session.
- Responses are rendered as plain text rather than webpage HTML.
- The extension has no analytics, telemetry, remote scripts, or runtime dependencies.

Local extension storage is not a hardware-backed secret vault. Malware or another person with access to your Chrome profile may still obtain locally stored keys. Use restricted provider keys where available, monitor usage, and revoke any key you suspect has been exposed.

## Develop and test

No dependency installation or build step is required.

Run the automated tests:

```bash
node --test
```

Check JavaScript syntax:

```bash
find src tests -name '*.js' -print0 | xargs -0 -n1 node --check
```

## Manual verification checklist

- [ ] Chrome loads the unpacked extension without manifest or service-worker errors.
- [ ] The options page initially selects OpenAI and displays the default prompt with an empty, disabled model dropdown.
- [ ] A valid OpenAI key loads a sorted model dropdown; an invalid key clears it and displays an invalid-key error.
- [ ] A valid Gemini key loads text-generation models; an invalid key clears the dropdown and displays an invalid-key error.
- [ ] A temporary model-loading failure is distinguishable from an invalid key and preserves an existing saved model.
- [ ] OpenAI settings save and remain after closing and reopening Settings.
- [ ] Gemini settings save and remain after closing and reopening Settings.
- [ ] Switching providers displays the matching configuration while preserving the other provider's saved configuration.
- [ ] **Forget keys** clears both keys and keeps the selected provider and custom prompt.
- [ ] The context-menu item appears only when non-empty webpage text is selected.
- [ ] Selecting the menu item opens the side panel in a loading state.
- [ ] A valid OpenAI configuration produces a response.
- [ ] A valid Gemini configuration produces a response.
- [ ] **Copy response** copies the complete plain-text result.
- [ ] **Retry** repeats the last selected text using the latest saved settings.
- [ ] Configuration, rate-limit, and network errors are readable and do not expose secret values.
- [ ] Settings persist after restarting Chrome.
- [ ] Selected text and responses disappear after ending the browser session.
