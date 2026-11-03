import { runRewrite } from './coordinator.js';
import { createChoiceState } from './core/request-state.js';
import { handleModelDiscovery } from './model-discovery.js';
import { callGemini, listGeminiModels } from './providers/gemini.js';
import { callOpenAI, listOpenAIModels } from './providers/openai.js';

const MENU_ID = 'rewrite-with-ai';
const SESSION_STATE_KEY = 'rewriteRequestState';

async function hardenStorageAccess() {
  await Promise.all([
    chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }),
    chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }),
  ]);
}

function rewrite(selectedText, promptId, modelOverride) {
  return runRewrite(selectedText, promptId, {
    loadSettings: () => chrome.storage.local.get(),
    saveState: (state) => chrome.storage.session.set({
      [SESSION_STATE_KEY]: state,
    }),
    makeRequestId: () => crypto.randomUUID(),
    modelOverride,
    providers: {
      openai: callOpenAI,
      gemini: callGemini,
    },
  });
}

function choosePrompt(selectedText) {
  return chrome.storage.session.set({
    [SESSION_STATE_KEY]: createChoiceState(crypto.randomUUID(), selectedText),
  });
}

function logInternalFailure(error) {
  console.error('Rewrite with AI internal failure:', error?.message ?? error);
}

void hardenStorageAccess().catch(logInternalFailure);

chrome.runtime.onInstalled.addListener(() => {
  void hardenStorageAccess().catch(logInternalFailure);
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: 'Rewrite with AI',
      contexts: ['selection'],
    });
  });
});

chrome.action.onClicked.addListener(() => {
  void chrome.runtime.openOptionsPage().catch(logInternalFailure);
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID || !info.selectionText?.trim()) {
    return;
  }

  // Open the panel right away (it must stay within the user gesture), then
  // save the selection so the panel can offer the prompt list.
  if (typeof tab?.id === 'number') {
    void chrome.sidePanel.open({ tabId: tab.id }).catch(logInternalFailure);
  }
  void choosePrompt(info.selectionText).catch(logInternalFailure);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'list-provider-models') {
    handleModelDiscovery(message, {
      providers: {
        openai: listOpenAIModels,
        gemini: listGeminiModels,
      },
    })
      .then(sendResponse)
      .catch(() => sendResponse({
        ok: false,
        error: {
          message: 'Could not load models. Try again.',
          invalidKey: false,
          retryable: true,
        },
      }));

    return true;
  }

  if (message?.type === 'run-rewrite') {
    chrome.storage.session.get(SESSION_STATE_KEY)
      .then((stored) => {
        const state = stored[SESSION_STATE_KEY];
        // The panel may send edited selected text; fall back to the stored
        // selection it captured from the page.
        const selectedText = typeof message.selectedText === 'string'
          && message.selectedText.trim()
          ? message.selectedText
          : state?.selectedText;
        if (!selectedText?.trim()) {
          throw new Error('Select text on a webpage, then choose a prompt.');
        }
        if (typeof message.promptId !== 'string' || !message.promptId) {
          throw new Error('Choose a prompt.');
        }
        return rewrite(selectedText, message.promptId, message.model);
      })
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({
        ok: false,
        message: error?.message || 'Could not run the prompt.',
      }));

    return true;
  }

  if (message?.type === 'retry-last-request') {
    chrome.storage.session.get(SESSION_STATE_KEY)
      .then((stored) => {
        const last = stored[SESSION_STATE_KEY] ?? {};
        const promptId = last.promptId;
        const selectedText = typeof message.selectedText === 'string'
          && message.selectedText.trim()
          ? message.selectedText
          : last.selectedText;
        if (!selectedText) {
          throw new Error('There is no previous selection to retry.');
        }
        return rewrite(selectedText, promptId, message.model);
      })
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({
        ok: false,
        message: error?.message || 'Retry failed.',
      }));

    return true;
  }

  return false;
});
