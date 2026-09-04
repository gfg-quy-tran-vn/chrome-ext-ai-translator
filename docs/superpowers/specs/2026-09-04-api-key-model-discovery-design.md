# API-Key Validation and Model Discovery Design

## Purpose

Replace the editable model text fields with provider model dropdowns populated after the user explicitly validates an API key. A rejected key leaves the dropdown empty and displays an accurate invalid-key message.

This design extends the existing personal-use Rewrite with AI Chrome extension. It does not change the context-menu or side-panel rewrite flow.

## User Experience

Each provider configuration contains:

- A masked API-key field.
- A **Validate key & load models** button.
- A model dropdown.
- Inline validation status.

Before validation, the dropdown is disabled and says **Validate the API key first**. Clicking the validation button enters a loading state that disables the key field, validation button, model dropdown, and Save button for the duration of the request.

After successful validation, the dropdown contains the models returned by the selected provider and the status reports how many models were found. If the previously selected model is in the returned list, it remains selected. Otherwise, the dropdown prompts the user to choose a model rather than silently selecting one.

An HTTP 401 or 403 response means the key is invalid. The dropdown is emptied and disabled, and the status says that the selected provider rejected the API key. Rate limits, server failures, timeouts, and network failures use distinct messages and are not mislabeled as invalid keys.

Editing the active provider's key after successful validation immediately clears and disables that provider's model dropdown. The changed key cannot be saved until it has successfully loaded models.

## Existing Saved Settings

When Settings opens with a previously saved key and model, the dropdown contains the saved model as its only initial option. The status explains that validation will refresh available models. The unchanged saved configuration may be saved again without another network request, allowing prompt-only edits while offline.

If the user changes the saved key, the saved model option is removed and successful validation becomes required before saving that changed key. Switching providers preserves each provider's independent key, model selection, and in-memory validation state.

**Forget keys** clears both keys, both model dropdowns, and both validation states. It preserves the provider choice, custom prompt, and default model preference stored in application defaults, but no model can be selected again until a key is validated.

## Architecture

### Options page

The options page owns visual and interaction state for each provider:

- Current key text.
- The key value originally loaded from storage.
- Whether the current key is unchanged from the saved key or was validated successfully in this page session.
- Available model IDs.
- Selected model.
- Loading and error status.

The options page never calls provider origins directly. It sends a trusted extension message containing the provider and the currently typed key to the service worker. The key is not persisted during this exchange.

Model-dropdown state transitions and model-option reconciliation live in a small provider-neutral module so they can be unit tested without a DOM or Chrome runtime.

### Service worker

The service worker adds a `list-provider-models` message handler. It validates the message shape, dispatches to the selected provider's model-list adapter, and returns either:

```js
{ ok: true, models: ['model-a', 'model-b'] }
```

or:

```js
{
  ok: false,
  error: {
    message: 'OpenAI rejected the API key. Check it and try again.',
    invalidKey: true,
    retryable: false,
  },
}
```

No response contains the API key, provider payload, request headers, or unfiltered exception details.

### Provider adapters

OpenAI model discovery sends `GET https://api.openai.com/v1/models` with Bearer authorization. It reads model IDs from the response `data` array, removes blank or duplicate IDs, and returns them in case-insensitive alphabetical order. Because the OpenAI model-list response does not provide reliable generation-capability metadata for every model, the extension shows all model IDs made available to the key.

Gemini model discovery sends paginated `GET https://generativelanguage.googleapis.com/v1beta/models` requests with the key in the `x-goog-api-key` header. It follows `nextPageToken`, keeps only entries whose `supportedGenerationMethods` include `generateContent`, strips the leading `models/` name prefix, removes blank or duplicate IDs, and returns them in case-insensitive alphabetical order.

Both adapters use the existing timeout and normalized provider-error conventions. Authentication errors are additionally marked `invalidKey: true` for settings-page behavior.

## Saving Rules

Save remains available when every active-provider condition is true:

1. The active key and model are non-empty.
2. The active key exactly matches the key originally loaded from storage, or it was validated successfully during the current settings-page session.
3. The selected model is present in the current dropdown.

A newly entered or changed key that has not passed validation produces an inline instruction to validate it instead of being persisted. Configuration for the inactive provider remains preserved exactly as entered or loaded.

## Security and Privacy

- Model-list requests originate only from the service worker.
- Keys use authorization headers, never query strings.
- Validation messages travel only between trusted extension contexts.
- Typed keys are not written to storage until the user explicitly saves settings.
- Keys and raw provider responses are excluded from logs and displayed errors.
- Host permissions remain limited to the existing official OpenAI and Gemini API origins.

## Testing

Automated tests cover:

- OpenAI model-list request headers, normalized model IDs, duplicate removal, sorting, invalid-key errors, rate limits, empty lists, and network failures.
- Gemini request headers, `generateContent` capability filtering, prefix removal, pagination, duplicate removal, sorting, invalid-key errors, rate limits, empty lists, and network failures.
- Service-worker message validation, provider dispatch, success responses, and sanitized failure responses.
- Options state transitions for initial saved settings, key editing, loading, validation success, invalid keys, transient failures, provider switching, model preservation, Save eligibility, and Forget Keys.
- Model option rendering through safe DOM text APIs.

Manual Chrome verification covers valid and invalid keys for both providers, loading/disabled controls, accurate status messages, model selection persistence, key-change invalidation, prompt-only saves with an unchanged stored key, and refreshing models after reopening Settings.

## Success Criteria

The change is complete when a user can enter an OpenAI or Gemini key, explicitly validate it, choose from models returned for that key, save the configuration, and use the existing rewrite flow. Invalid keys reliably empty the model dropdown and display an invalid-key message, while transient failures remain distinguishable. Automated tests and the Chrome manual verification checklist pass without exposing API keys.
