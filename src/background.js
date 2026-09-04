import { runRewrite } from './coordinator.js';
import { callGemini } from './providers/gemini.js';
import { callOpenAI } from './providers/openai.js';

const MENU_ID = 'rewrite-with-ai';
const SESSION_STATE_KEY = 'rewriteRequestState';

async function hardenStorageAccess() {
  await Promise.all([
    chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }),
    chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }),
  ]);
}

function rewrite(selectedText) {
  return runRewrite(selectedText, {
    loadSettings: () => chrome.storage.local.get(),
    saveState: (state) => chrome.storage.session.set({
      [SESSION_STATE_KEY]: state,
    }),
    makeRequestId: () => crypto.randomUUID(),
    providers: {
      openai: callOpenAI,
      gemini: callGemini,
    },
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

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID || !info.selectionText?.trim()) {
    return;
  }

  const rewritePromise = rewrite(info.selectionText);
  if (typeof tab?.id === 'number') {
    void chrome.sidePanel.open({ tabId: tab.id }).catch(logInternalFailure);
  }
  void rewritePromise.catch(logInternalFailure);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'retry-last-request') {
    return false;
  }

  chrome.storage.session.get(SESSION_STATE_KEY)
    .then((stored) => {
      const selectedText = stored[SESSION_STATE_KEY]?.selectedText;
      if (!selectedText) {
        throw new Error('There is no previous selection to retry.');
      }
      return rewrite(selectedText);
    })
    .then(() => sendResponse({ ok: true }))
    .catch((error) => sendResponse({
      ok: false,
      message: error?.message || 'Retry failed.',
    }));

  return true;
});
