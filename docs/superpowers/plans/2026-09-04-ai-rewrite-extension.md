# AI Rewrite Chrome Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a locally installable Chrome extension that sends selected webpage text to OpenAI or Gemini and displays the rewritten response in Chrome's side panel.

**Architecture:** A Manifest V3 service worker owns the context menu, settings validation, provider calls, and temporary request state. Provider-neutral core modules keep prompt and configuration behavior testable, while extension-owned options and side-panel pages use Chrome storage and messaging APIs. Persistent secrets stay in restricted local storage; selected text and results stay in session storage.

**Tech Stack:** Manifest V3, browser-native HTML/CSS/JavaScript modules, Chrome Extensions APIs, Node.js built-in test runner.

---

## File Structure

- `manifest.json` — Chrome manifest, permissions, service worker, options page, side-panel page, and provider origins.
- `package.json` — ESM configuration and test scripts; no runtime dependencies.
- `src/core/settings.js` — defaults, active-provider lookup, and validation.
- `src/core/prompt.js` — deterministic instruction and selected-text formatting.
- `src/core/request-state.js` — normalized loading, success, and error session states.
- `src/providers/provider-error.js` — safe normalized provider errors.
- `src/providers/openai.js` — OpenAI Responses API request and parsing.
- `src/providers/gemini.js` — Gemini generateContent request and parsing.
- `src/background.js` — Chrome event wiring and request coordination.
- `src/options/options.html`, `options.css`, `options.js` — local configuration UI.
- `src/sidepanel/sidepanel.html`, `sidepanel.css`, `render.js`, `sidepanel.js` — result UI, pure renderer, and Chrome event wiring.
- `tests/*.test.js` — unit and coordinator tests using `node:test`.
- `README.md` — installation, configuration, use, privacy, and manual verification.

### Task 1: Project shell and manifest

**Files:**
- Create: `package.json`
- Create: `manifest.json`
- Create: `tests/manifest.test.js`

- [ ] **Step 1: Write the failing manifest test**

Create `tests/manifest.test.js` to load `manifest.json` and assert Manifest V3, the module service worker, selection-only context-menu support permissions, side panel, storage, options page, and only the two official provider origins.

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('manifest grants only the extension capabilities and provider origins in scope', async () => {
  const manifest = JSON.parse(await readFile(new URL('../manifest.json', import.meta.url)));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions.sort(), ['contextMenus', 'sidePanel', 'storage'].sort());
  assert.deepEqual(manifest.host_permissions.sort(), [
    'https://api.openai.com/*',
    'https://generativelanguage.googleapis.com/*',
  ].sort());
  assert.deepEqual(manifest.background, { service_worker: 'src/background.js', type: 'module' });
  assert.equal(manifest.side_panel.default_path, 'src/sidepanel/sidepanel.html');
  assert.equal(manifest.options_page, 'src/options/options.html');
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/manifest.test.js`

Expected: FAIL because `manifest.json` does not exist.

- [ ] **Step 3: Add the minimal package and manifest**

Create `package.json` with `"type": "module"` and `"test": "node --test"`. Create a Manifest V3 manifest named **Rewrite with AI**, minimum Chrome 116, the permissions and host permissions asserted above, module service worker, options page, and side-panel default path.

- [ ] **Step 4: Run the test and verify GREEN**

Run: `npm test`

Expected: one passing test and no warnings.

- [ ] **Step 5: Commit**

Run: `git add package.json manifest.json tests/manifest.test.js && git commit -m "chore: add extension manifest"`

### Task 2: Settings, prompt, and request-state core

**Files:**
- Create: `src/core/settings.js`
- Create: `src/core/prompt.js`
- Create: `src/core/request-state.js`
- Create: `tests/settings.test.js`
- Create: `tests/prompt.test.js`
- Create: `tests/request-state.test.js`

- [ ] **Step 1: Write failing settings tests**

Test that `createDefaultSettings()` returns the OpenAI provider, editable model defaults, empty keys, and the approved rewrite instruction; `getActiveProviderConfig()` returns only the active provider's key/model; and `validateSettings()` rejects unknown providers, missing keys, and missing models without including key material in errors.

```js
const defaults = createDefaultSettings();
assert.equal(defaults.provider, 'openai');
assert.equal(defaults.prompt, DEFAULT_PROMPT);
assert.deepEqual(getActiveProviderConfig({ ...defaults, openaiApiKey: 'secret' }), {
  provider: 'openai', apiKey: 'secret', model: defaults.openaiModel,
});
assert.deepEqual(validateSettings({ ...defaults, openaiApiKey: '' }), {
  valid: false, message: 'Add your OpenAI API key in Settings.', configuration: true,
});
```

- [ ] **Step 2: Run settings tests and verify RED**

Run: `node --test tests/settings.test.js`

Expected: FAIL because `src/core/settings.js` does not exist.

- [ ] **Step 3: Implement minimal settings behavior**

Export `DEFAULT_PROMPT`, immutable defaults, `createDefaultSettings(stored = {})`, `getActiveProviderConfig(settings)`, and `validateSettings(settings)`. Use `gpt-5-mini` and `gemini-2.5-flash` as editable starting values rather than hidden provider defaults.

- [ ] **Step 4: Run settings tests and verify GREEN**

Run: `node --test tests/settings.test.js`

Expected: all settings tests pass.

- [ ] **Step 5: Write failing prompt and request-state tests**

Test that blank prompts use `DEFAULT_PROMPT`, whitespace is trimmed, selected text is appended between explicit delimiters, blank selected text is rejected, and state factories omit undefined secrets.

```js
assert.equal(buildPrompt('Improve this.', '  rough words  '),
  'Improve this.\n\nSelected text:\n---\nrough words\n---');
assert.throws(() => buildPrompt(DEFAULT_PROMPT, '   '), /Select some text/);
assert.deepEqual(createLoadingState('id-1', 'hello', 'gemini'), {
  status: 'loading', requestId: 'id-1', selectedText: 'hello', provider: 'gemini',
});
```

- [ ] **Step 6: Run prompt/state tests and verify RED**

Run: `node --test tests/prompt.test.js tests/request-state.test.js`

Expected: FAIL because the modules do not exist.

- [ ] **Step 7: Implement prompt and request-state factories**

Implement `buildPrompt(customPrompt, selectedText)` and `createLoadingState`, `createSuccessState`, and `createErrorState`. Error state stores only the normalized message, retryability, and configuration flag.

- [ ] **Step 8: Run all core tests and commit**

Run: `npm test`

Expected: all tests pass.

Run: `git add src/core tests/settings.test.js tests/prompt.test.js tests/request-state.test.js && git commit -m "feat: add request configuration core"`

### Task 3: Provider adapters

**Files:**
- Create: `src/providers/provider-error.js`
- Create: `src/providers/openai.js`
- Create: `src/providers/gemini.js`
- Create: `tests/openai.test.js`
- Create: `tests/gemini.test.js`

- [ ] **Step 1: Write failing OpenAI adapter tests**

Use a capturing fake `fetch` to assert a POST to `https://api.openai.com/v1/responses`, Bearer authorization, JSON content type, configured model/input, extraction of `output[].content[]` items whose type is `output_text`, and safe errors for HTTP 401, 429, empty output, and network rejection.

```js
const fetchImpl = async (url, options) => {
  assert.equal(url, 'https://api.openai.com/v1/responses');
  assert.equal(options.headers.Authorization, 'Bearer test-key');
  assert.deepEqual(JSON.parse(options.body), { model: 'gpt-test', input: 'rewrite me' });
  return jsonResponse({ output: [{ content: [{ type: 'output_text', text: 'Rewritten.' }] }] });
};
assert.equal(await callOpenAI({ apiKey: 'test-key', model: 'gpt-test', prompt: 'rewrite me', fetchImpl }), 'Rewritten.');
```

- [ ] **Step 2: Run OpenAI tests and verify RED**

Run: `node --test tests/openai.test.js`

Expected: FAIL because the adapter does not exist.

- [ ] **Step 3: Implement the OpenAI adapter**

Implement `callOpenAI({ apiKey, model, prompt, fetchImpl = fetch })`. Normalize failures through a `ProviderError` carrying `message`, `retryable`, and `configuration`, never the request headers or key.

- [ ] **Step 4: Run OpenAI tests and verify GREEN**

Run: `node --test tests/openai.test.js`

Expected: all OpenAI adapter tests pass.

- [ ] **Step 5: Write failing Gemini adapter tests**

Assert a POST to `https://generativelanguage.googleapis.com/v1beta/models/<encoded-model>:generateContent`, `x-goog-api-key` header rather than a query parameter, the Gemini `contents.parts.text` body, text extraction across candidate parts, and normalized 401/403, 429, empty, and network failures.

```js
const fetchImpl = async (url, options) => {
  assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent');
  assert.equal(options.headers['x-goog-api-key'], 'test-key');
  assert.deepEqual(JSON.parse(options.body), { contents: [{ parts: [{ text: 'rewrite me' }] }] });
  return jsonResponse({ candidates: [{ content: { parts: [{ text: 'Rewritten.' }] } }] });
};
assert.equal(await callGemini({ apiKey: 'test-key', model: 'gemini-test', prompt: 'rewrite me', fetchImpl }), 'Rewritten.');
```

- [ ] **Step 6: Run Gemini tests and verify RED**

Run: `node --test tests/gemini.test.js`

Expected: FAIL because the adapter does not exist.

- [ ] **Step 7: Implement Gemini and verify all provider tests**

Implement `callGemini()` using the API-key request header, encoded model path, and the same `ProviderError` semantics as OpenAI.

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 8: Commit**

Run: `git add src/providers tests/openai.test.js tests/gemini.test.js && git commit -m "feat: add OpenAI and Gemini adapters"`

### Task 4: Request coordinator and Chrome service worker

**Files:**
- Create: `src/coordinator.js`
- Create: `src/background.js`
- Create: `tests/coordinator.test.js`

- [ ] **Step 1: Write failing coordinator tests**

Inject settings loading, state saving, IDs, and provider adapters. Test loading-to-success, loading-to-error, provider selection, blank selections, and retry using the last selected text. Assert no saved state contains an API key.

```js
const states = [];
const result = await runRewrite(' rough text ', {
  loadSettings: async () => ({ ...createDefaultSettings(), openaiApiKey: 'secret' }),
  saveState: async state => states.push(state),
  makeRequestId: () => 'request-1',
  providers: { openai: async ({ prompt }) => `done:${prompt}`, gemini: async () => '' },
});
assert.equal(states[0].status, 'loading');
assert.equal(states[1].status, 'success');
assert.equal(JSON.stringify(states).includes('secret'), false);
assert.equal(result.status, 'success');
```

- [ ] **Step 2: Run coordinator tests and verify RED**

Run: `node --test tests/coordinator.test.js`

Expected: FAIL because `src/coordinator.js` does not exist.

- [ ] **Step 3: Implement the provider-neutral coordinator**

Implement `runRewrite(selectedText, dependencies)` with validation, prompt building, loading state before the network call, provider dispatch, normalized errors, and success state after a non-empty result.

- [ ] **Step 4: Run coordinator tests and verify GREEN**

Run: `node --test tests/coordinator.test.js`

Expected: all coordinator tests pass.

- [ ] **Step 5: Add the service-worker wiring**

In `src/background.js`, restrict local and session storage to `TRUSTED_CONTEXTS`, register one selection-only context menu on install, open the tab's side panel from the menu click, invoke the coordinator, and handle `{ type: 'retry-last-request' }` by loading the last session state's `selectedText`. Use `crypto.randomUUID()` for request IDs.

- [ ] **Step 6: Verify and commit**

Run: `npm test`

Expected: all tests pass.

Run: `git add src/coordinator.js src/background.js tests/coordinator.test.js && git commit -m "feat: coordinate context menu rewrite requests"`

### Task 5: Options UI

**Files:**
- Create: `src/options/options.html`
- Create: `src/options/options.css`
- Create: `src/options/options.js`

- [ ] **Step 1: Add semantic settings markup and styles**

Create labeled OpenAI/Gemini radio controls, provider-specific password and model inputs, a shared prompt textarea, status region with `aria-live="polite"`, Save Settings, and Forget Keys. Keep both provider field groups in the DOM and hide the inactive group using the `hidden` attribute.

- [ ] **Step 2: Implement settings behavior**

On load, merge stored values through `createDefaultSettings()`. On provider change, reveal the matching key/model group. On save, trim model values, preserve key text exactly except surrounding whitespace, validate the active provider, write all settings to `chrome.storage.local`, and show a status. Forget Keys clears both keys while preserving provider, models, and prompt.

- [ ] **Step 3: Verify syntax, tests, and manifest references**

Run: `node --check src/options/options.js && npm test`

Expected: syntax check succeeds and all tests pass.

- [ ] **Step 4: Commit**

Run: `git add src/options && git commit -m "feat: add provider settings page"`

### Task 6: Side-panel renderer and behavior

**Files:**
- Create: `src/sidepanel/sidepanel.html`
- Create: `src/sidepanel/sidepanel.css`
- Create: `src/sidepanel/render.js`
- Create: `src/sidepanel/sidepanel.js`
- Create: `tests/render.test.js`

- [ ] **Step 1: Write the failing renderer tests**

Pass simple element doubles into `renderState(elements, state)` and test empty, loading, success, and error views. Prove selected text and generated strings are assigned to `textContent`, Copy is enabled only for success, Retry is available after success and retryable failures, and Settings appears for configuration failures.

```js
const elements = createElementDoubles();
renderState(elements, {
  status: 'success', selectedText: '<img src=x onerror=alert(1)>', result: '<b>safe text</b>', provider: 'openai',
});
assert.equal(elements.selectedText.textContent, '<img src=x onerror=alert(1)>');
assert.equal(elements.result.textContent, '<b>safe text</b>');
assert.equal(elements.copyButton.hidden, false);
```

- [ ] **Step 2: Run renderer tests and verify RED**

Run: `node --test tests/render.test.js`

Expected: FAIL because the renderer does not exist.

- [ ] **Step 3: Implement the pure renderer**

Implement `renderState(elements, state)` without `innerHTML`. It toggles view sections, updates provider/status labels, and assigns user/provider-controlled strings only through `textContent`.

- [ ] **Step 4: Run renderer tests and verify GREEN**

Run: `node --test tests/render.test.js`

Expected: all renderer tests pass.

- [ ] **Step 5: Add side-panel markup, styling, and Chrome wiring**

Create accessible empty/loading/success/error sections; selected-text and response blocks; Copy, Retry, and Open Settings buttons; and a small provider label. On startup, read session state and render it. Listen to `chrome.storage.onChanged` for session updates. Copy uses `navigator.clipboard.writeText`, Retry sends `{ type: 'retry-last-request' }`, and Settings uses `chrome.runtime.openOptionsPage()`.

- [ ] **Step 6: Verify and commit**

Run: `node --check src/sidepanel/sidepanel.js && npm test`

Expected: syntax checks and all tests pass.

Run: `git add src/sidepanel tests/render.test.js && git commit -m "feat: add rewrite response side panel"`

### Task 7: Documentation and final verification

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write installation and usage documentation**

Document: open `chrome://extensions`, enable Developer mode, Load unpacked from this repository, open extension details/options, save an OpenAI or Gemini configuration, select webpage text, choose **Rewrite with AI**, and read/copy the side-panel result. Include the local-key privacy limitation and provider links for creating keys.

- [ ] **Step 2: Add the manual verification checklist**

Include checkboxes for both providers, settings persistence, selection-only menu visibility, side-panel loading/success/error states, Copy, Retry, Forget Keys, Chrome restart persistence, and session-result expiration.

- [ ] **Step 3: Run automated verification**

Run: `npm test`

Expected: every test passes with zero failures.

Run: `find src tests -name '*.js' -print0 | xargs -0 -n1 node --check`

Expected: every JavaScript file passes syntax checking.

- [ ] **Step 4: Inspect the final extension package**

Run: `git status --short && git diff --check && git log --oneline --decorate -8`

Expected: only the plan/README work intended for the final documentation commit is uncommitted, `git diff --check` is silent, and feature commits are present.

- [ ] **Step 5: Commit documentation**

Run: `git add README.md docs/superpowers/plans/2026-09-04-ai-rewrite-extension.md && git commit -m "docs: add extension setup and verification guide"`

- [ ] **Step 6: Final clean verification**

Run: `npm test && git status --short --branch`

Expected: all tests pass and the branch is clean.
