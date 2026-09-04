# API-Key Validation and Model Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Validate OpenAI and Gemini API keys on demand and populate provider-specific model dropdowns from live model-list APIs.

**Architecture:** Provider adapters add pure, fetch-injected model-list functions and normalized invalid-key metadata. A provider-neutral discovery handler is called by the service worker's trusted runtime-message boundary. The options page uses a pure per-provider validation state machine to render safe dropdown options, enforce validation for changed keys, and preserve unchanged saved settings.

**Tech Stack:** Manifest V3, browser-native JavaScript modules and DOM APIs, Chrome runtime messaging, Node.js built-in test runner.

---

## File Structure

- Modify `src/providers/provider-error.js` — add sanitized `invalidKey` metadata.
- Modify `src/providers/openai.js` — add OpenAI model listing.
- Modify `src/providers/gemini.js` — add paginated Gemini generation-model listing.
- Create `src/model-discovery.js` — validate and dispatch provider-neutral discovery messages.
- Modify `src/background.js` — route `list-provider-models` messages.
- Create `src/options/model-state.js` — pure validation/dropdown/save state transitions.
- Modify `src/options/options.html` — replace model inputs with dropdowns and validation controls.
- Modify `src/options/options.css` — style validation and disabled states.
- Modify `src/options/options.js` — connect state transitions, messaging, model rendering, and saving.
- Modify `README.md` — document live key validation and model loading.
- Modify `tests/openai.test.js`, `tests/gemini.test.js` — provider list behavior.
- Create `tests/model-discovery.test.js`, `tests/model-state.test.js` — service and options state behavior.

### Task 1: Provider model-list adapters

**Files:**
- Modify: `src/providers/provider-error.js`
- Modify: `src/providers/openai.js`
- Modify: `src/providers/gemini.js`
- Modify: `tests/openai.test.js`
- Modify: `tests/gemini.test.js`

- [ ] **Step 1: Write failing OpenAI model-list tests**

Add tests that import `listOpenAIModels`, assert `GET https://api.openai.com/v1/models`, Bearer authorization, no request body, case-insensitive sorting, blank/duplicate removal, empty-list failure, and 401 metadata:

```js
const models = await listOpenAIModels({
  apiKey: 'test-key',
  fetchImpl: async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/models');
    assert.equal(options.method, 'GET');
    assert.equal(options.headers.Authorization, 'Bearer test-key');
    return jsonResponse({ data: [{ id: 'z-model' }, { id: 'A-model' }, { id: 'A-model' }, { id: '' }] });
  },
});
assert.deepEqual(models, ['A-model', 'z-model']);
```

- [ ] **Step 2: Run OpenAI tests and verify RED**

Run: `node --test tests/openai.test.js`

Expected: FAIL because `listOpenAIModels` is not exported.

- [ ] **Step 3: Implement OpenAI listing and invalid-key metadata**

Extend `ProviderError` with `invalidKey = false`; make 401/403 HTTP errors set `{ configuration: true, invalidKey: true }`. Implement `listOpenAIModels({ apiKey, fetchImpl = fetch })` using the existing timeout and error normalizers. Normalize IDs with `trim()`, `Set`, and `localeCompare(..., { sensitivity: 'base' })`; throw `OpenAI returned no available models.` if empty.

- [ ] **Step 4: Run OpenAI tests and verify GREEN**

Run: `node --test tests/openai.test.js`

Expected: all OpenAI tests pass.

- [ ] **Step 5: Write failing Gemini model-list tests**

Add tests that import `listGeminiModels`, capture two paginated requests, assert the key header and encoded `pageToken`, retain only `generateContent` models, strip `models/`, deduplicate/sort, and verify empty-list and 403 invalid-key failures:

```js
assert.deepEqual(await listGeminiModels({ apiKey: 'test-key', fetchImpl }), [
  'gemini-a',
  'gemini-z',
]);
assert.equal(requests[1],
  'https://generativelanguage.googleapis.com/v1beta/models?pageToken=next-token');
```

- [ ] **Step 6: Run Gemini tests and verify RED**

Run: `node --test tests/gemini.test.js`

Expected: FAIL because `listGeminiModels` is not exported.

- [ ] **Step 7: Implement Gemini listing and verify providers**

Implement `listGeminiModels({ apiKey, fetchImpl = fetch })` with a `do/while` page-token loop, the existing timeout/error handling, `supportedGenerationMethods.includes('generateContent')`, prefix removal, deduplication, and sorting.

Run: `node --test tests/openai.test.js tests/gemini.test.js`

Expected: all provider tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/providers tests/openai.test.js tests/gemini.test.js
git commit -m "feat: list models for configured AI providers"
```

### Task 2: Trusted model-discovery message service

**Files:**
- Create: `src/model-discovery.js`
- Modify: `src/background.js`
- Create: `tests/model-discovery.test.js`

- [ ] **Step 1: Write failing discovery-handler tests**

Test `handleModelDiscovery(message, { providers })` for invalid provider, blank key, correct provider dispatch, sorted success output, sanitized provider failures, and no key leakage:

```js
assert.deepEqual(await handleModelDiscovery(
  { provider: 'openai', apiKey: 'secret' },
  { providers: { openai: async ({ apiKey }) => {
    assert.equal(apiKey, 'secret');
    return ['gpt-b', 'gpt-a'];
  } } },
), { ok: true, models: ['gpt-b', 'gpt-a'] });
```

For a `ProviderError`, expect only `{ message, invalidKey, retryable }` inside the error response and assert `JSON.stringify(response)` excludes the key.

- [ ] **Step 2: Run discovery tests and verify RED**

Run: `node --test tests/model-discovery.test.js`

Expected: FAIL because `src/model-discovery.js` does not exist.

- [ ] **Step 3: Implement the pure handler**

Export `handleModelDiscovery(message, dependencies)`. Reject providers outside `openai`/`gemini` and blank keys before adapter dispatch. Return sanitized result objects without throwing across the runtime boundary.

- [ ] **Step 4: Run discovery tests and verify GREEN**

Run: `node --test tests/model-discovery.test.js`

Expected: all discovery tests pass.

- [ ] **Step 5: Wire the Chrome runtime message**

Import `handleModelDiscovery`, `listOpenAIModels`, and `listGeminiModels` in `src/background.js`. In `onMessage`, route `{ type: 'list-provider-models' }` to the discovery handler, call `sendResponse(response)`, and return `true`. Preserve the existing retry route unchanged.

- [ ] **Step 6: Verify and commit**

Run: `node --check src/background.js && node --test`

Expected: syntax succeeds and all tests pass.

```bash
git add src/model-discovery.js src/background.js tests/model-discovery.test.js
git commit -m "feat: expose trusted model discovery messaging"
```

### Task 3: Options validation state machine

**Files:**
- Create: `src/options/model-state.js`
- Create: `tests/model-state.test.js`

- [ ] **Step 1: Write failing state tests**

Test these exported functions: `createModelState`, `editKey`, `startValidation`, `validationSucceeded`, `validationFailed`, `selectModel`, and `canSaveModelState`.

```js
const saved = createModelState({ savedKey: 'key-1', savedModel: 'model-a' });
assert.deepEqual(saved.models, ['model-a']);
assert.equal(canSaveModelState(saved), true);

const changed = editKey(saved, 'key-2');
assert.deepEqual(changed.models, []);
assert.equal(canSaveModelState(changed), false);

const valid = validationSucceeded(startValidation(changed), ['model-b', 'model-c']);
assert.equal(valid.validation, 'valid');
assert.equal(canSaveModelState(selectModel(valid, 'model-b')), true);
```

Also test reverting to the saved key, preserving model choices when refreshing the same key, clearing on invalid-key failure, preserving choices on transient failure, and an empty successful list remaining unsavable.

- [ ] **Step 2: Run state tests and verify RED**

Run: `node --test tests/model-state.test.js`

Expected: FAIL because `src/options/model-state.js` does not exist.

- [ ] **Step 3: Implement immutable state transitions**

Each function returns a new object. State contains `savedKey`, `savedModel`, `key`, `models`, `selectedModel`, `validation`, `message`, and `loading`. `canSaveModelState` requires a non-empty key, a selected model present in `models`, and either an unchanged saved key or `validation === 'valid'`.

- [ ] **Step 4: Run state tests and commit**

Run: `node --test tests/model-state.test.js && node --test`

Expected: all state and project tests pass.

```bash
git add src/options/model-state.js tests/model-state.test.js
git commit -m "feat: model API key validation states"
```

### Task 4: Model dropdown settings UI

**Files:**
- Modify: `src/options/options.html`
- Modify: `src/options/options.css`
- Modify: `src/options/options.js`
- Modify: `README.md`

- [ ] **Step 1: Replace model inputs with validation controls**

For each provider, keep the password input; add a provider-specific validation button, inline `role="status"` element, and disabled `<select>` model control. Give Save Settings the ID `save-settings`.

- [ ] **Step 2: Connect provider states and safe rendering**

Initialize independent OpenAI and Gemini states from stored settings. On key `input`, call `editKey`. On validation click, call `startValidation`, send `{ type: 'list-provider-models', provider, apiKey }`, then apply `validationSucceeded` or `validationFailed`. Render options using `document.createElement('option')`, `.value`, and `.textContent`, never `innerHTML`.

- [ ] **Step 3: Enforce save and forget rules**

Disable Save during validation or when the active provider cannot be saved. Persist a changed key only if its state is valid; otherwise retain that provider's originally saved key/model. After saving, rebuild provider states from the stored result. Forget Keys writes empty keys plus default models, resets both states, and renders empty disabled dropdowns.

- [ ] **Step 4: Update styles and documentation**

Style validation buttons, selects, loading/valid/error statuses, and disabled controls consistently with the existing options page. Update README configuration and verification instructions to include validation, live models, invalid-key behavior, and transient failures.

- [ ] **Step 5: Verify implementation**

Run: `find src tests -name '*.js' -print0 | xargs -0 -n1 node --check`

Expected: every JavaScript file passes syntax checking.

Run: `node --test`

Expected: all tests pass.

Run: `git diff --check`

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/options README.md
git commit -m "feat: validate keys and load model dropdowns"
```

### Task 5: Chrome verification and integration

**Files:**
- No production files expected.

- [ ] **Step 1: Reload the installed unpacked extension**

Use `chrome://extensions` to reload **Rewrite with AI** from the existing feature worktree. Confirm no manifest or service-worker errors.

- [ ] **Step 2: Verify settings without real credentials**

Confirm both providers render a disabled model dropdown before validation, changing keys clears model options, validation enters a loading state, a deliberately invalid non-secret key produces the invalid-key message and an empty dropdown, and no key appears in visible errors.

- [ ] **Step 3: Run fresh final verification**

Run: `node --test`

Expected: all tests pass with zero failures.

Run: `git status --short --branch && git diff --check`

Expected: clean feature branch and no whitespace errors.

- [ ] **Step 4: Merge locally and verify main**

Fast-forward `main` to the feature branch, run `node --test` from the main checkout, then reinstall the unpacked extension from `/Users/bill/Working/_tools/ai-rewrite-extension` before removing the temporary worktree.
