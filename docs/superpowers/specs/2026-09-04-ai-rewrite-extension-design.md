# AI Rewrite Chrome Extension Design

## Purpose

Build a personal-use Chrome extension that rewrites selected webpage text into clear, well-structured English. The user selects text, opens Chrome's context menu, chooses **Rewrite with AI**, and reads the result in Chrome's side panel.

The extension supports both OpenAI and Gemini. The user selects one active provider and configures that provider's API key, model, and an editable prompt. The default prompt is:

> Rewrite the selected text as clear, well-structured English sentences.

## Scope

The first version includes:

- A Manifest V3 Chrome extension implemented with plain HTML, CSS, and JavaScript.
- A context-menu command available only when text is selected.
- A Chrome side panel that opens immediately and shows the selected text, progress, response, and errors.
- Local settings for the active provider, separate OpenAI and Gemini API keys, separate model values, and one shared custom prompt.
- Direct HTTPS requests from the extension service worker to the selected provider.
- Copy, Retry, Open Settings, and Forget Keys actions.

The first version does not include a backend, user accounts, response history, multiple saved prompts, streaming responses, page-content modification, or Chrome Web Store publishing automation.

## Architecture

### Manifest and permissions

The extension uses Manifest V3. It requests only the permissions needed for `contextMenus`, `sidePanel`, and `storage`, plus narrowly scoped host permissions for the official OpenAI and Gemini API endpoints.

### Service worker

The service worker is the request coordinator. It:

1. Registers the **Rewrite with AI** selection context-menu item when the extension is installed.
2. Receives the selected text when the user clicks the menu item.
3. Opens the side panel for the current tab while the context-menu click still counts as a user gesture.
4. Validates the active provider configuration.
5. Constructs a request from the custom instruction and selected text.
6. Calls the active provider's HTTPS API.
7. Writes request progress, results, or errors to temporary extension session storage.

Provider-specific request construction and response parsing are isolated behind small OpenAI and Gemini adapter functions. The coordinator depends on their shared success/error shape rather than provider response details.

### Storage

Persistent settings use `chrome.storage.local` and are restricted to trusted extension contexts. They contain:

- Active provider: `openai` or `gemini`.
- OpenAI API key and model.
- Gemini API key and model.
- Shared custom prompt.

API keys never use synchronized storage, URLs, logs, page DOM, or content scripts. The settings screen masks saved key values and provides a **Forget keys** action. This reduces accidental exposure but does not claim to encrypt secrets against malware or someone with access to the Chrome profile.

The current selected text, request state, and response use `chrome.storage.session`. They are not retained after the browser session ends. The side panel listens for session-storage changes, allowing it to recover state if Chrome suspends and restarts the service worker.

### Side panel

The side panel is an extension-owned page. It renders all selected text, model output, and errors as plain text rather than HTML. It supports these states:

- Empty: guidance to select webpage text and use the context menu.
- Loading: selected text, active provider, and progress indicator.
- Success: selected text, provider response, Copy, and Retry.
- Error: readable message, Retry when appropriate, and Open Settings.

### Settings page

The settings page provides:

- An OpenAI/Gemini provider control.
- A masked API-key field for the selected provider.
- An editable model field for the selected provider.
- A shared custom-prompt textarea populated with the default rewrite prompt on first use.
- Save Settings and Forget Keys actions.

Both provider configurations remain saved locally, but only the active provider is called.

## Request Flow

1. The user selects non-empty text on a webpage.
2. The user chooses **Rewrite with AI** from the context menu.
3. The service worker records a loading request in session storage and opens the side panel.
4. The service worker loads and validates settings.
5. The service worker sends the custom instruction and delimited selected text to the chosen provider.
6. The provider adapter extracts the returned text or converts the failure into a normalized error.
7. The service worker records the result in session storage.
8. The side panel receives the storage change and renders the new state.

Retry repeats the last session request using the current saved settings. It does not require the user to select the text again.

## Prompt Construction

The custom prompt is treated as an instruction. The selected text is appended separately with an explicit label and delimiter so that it cannot accidentally merge with the instruction. Blank selected text is rejected before a provider call. A blank custom prompt falls back to the default rewrite instruction.

## Error Handling

The extension distinguishes and explains:

- Missing API key or model configuration.
- Invalid credentials or denied access.
- Provider rate limits.
- Network failures and timeouts.
- Provider responses with no usable text.
- Unexpected internal failures.

Raw API keys and full provider payloads are never included in displayed errors or logs. Retry is offered for transient and corrected-configuration failures. Open Settings is offered for configuration failures.

## Security and Privacy

- No content script is required; the selected text arrives through the context-menu click event.
- Only official provider HTTPS origins are allowed by host permissions.
- Network requests originate from the service worker, not the webpage.
- API keys are available only to trusted extension contexts.
- Provider output is assigned through text-only DOM APIs.
- No analytics, telemetry, remote scripts, or third-party runtime dependencies are included.
- Only the selected text, prompt, and necessary request metadata are sent to the chosen AI provider.

## Testing

Automated tests use Node's built-in test runner and cover:

- Default settings and provider-specific settings selection.
- Settings validation for both providers.
- Prompt construction, including blank prompt fallback and selected-text delimiters.
- OpenAI request creation, successful response parsing, and normalized errors.
- Gemini request creation, successful response parsing, and normalized errors.
- Coordinator state transitions from loading to success or error.
- Safe plain-text rendering behavior.

Manual Chrome verification covers:

- Loading the unpacked extension.
- Saving, switching, and restoring provider settings.
- Context-menu visibility only for selected text.
- Immediate side-panel opening and loading state.
- Successful requests against both providers.
- Copy, Retry, Open Settings, and Forget Keys behavior.
- Readable authentication, rate-limit, and network errors.
- Settings persistence across Chrome restarts and session-result expiration.

## Success Criteria

The design is complete when a locally loaded extension lets the user configure either provider, select text on a normal webpage, invoke **Rewrite with AI**, and receive a safely rendered answer in the side panel. Automated tests pass, the manual verification checklist passes, API keys do not enter page context or synchronized storage, and no feature outside the stated first-version scope is introduced.
