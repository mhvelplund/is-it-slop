import { getSettings } from '@/lib/storage';
import { getCriteria } from '@/lib/criteria/get-criteria';
import { providers } from '@/lib/providers';
import { runAnalysis } from '@/lib/run-analysis';
import { isMenuEnabled, MENU_ITEM_ID } from '@/lib/context-menu-sync';

async function ensureContentScriptAndNotifyLoading(tabId: number): Promise<boolean> {
  try {
    await browser.tabs.sendMessage(tabId, { type: 'SLOP_LOADING' });
    return true;
  } catch {
    try {
      await browser.scripting.executeScript({
        target: { tabId },
        files: ['/content-scripts/content.js'],
      });
      await browser.tabs.sendMessage(tabId, { type: 'SLOP_LOADING' });
      return true;
    } catch {
      return false;
    }
  }
}

export default defineBackground({
  main() {
    async function ensureContextMenu() {
      await browser.contextMenus.removeAll();
      browser.contextMenus.create({
        id: MENU_ITEM_ID,
        title: 'Is it slop?',
        contexts: ['selection'],
      });
    }

    async function syncMenuState() {
      const settings = await getSettings();
      await browser.contextMenus.update(MENU_ITEM_ID, {
        enabled: isMenuEnabled(settings),
      });
    }

    void ensureContextMenu().then(() => syncMenuState());

    browser.runtime.onInstalled.addListener(({ reason }) => {
      if (reason === 'install') {
        void browser.runtime.openOptionsPage();
      }
    });

    browser.storage.onChanged.addListener((_changes, areaName) => {
      if (areaName === 'local') {
        void syncMenuState();
      }
    });

    browser.contextMenus.onClicked.addListener((info, tab) => {
      if (info.menuItemId !== MENU_ITEM_ID || !tab?.id) return;
      const tabId = tab.id;
      const selectionText = info.selectionText ?? '';

      void (async () => {
        const ready = await ensureContentScriptAndNotifyLoading(tabId);
        if (!ready) return;

        await runAnalysis(selectionText, {
          getSettings,
          getCriteria,
          providers,
        })
          .then(async (result) => {
            if (result.type === 'result') {
              const settings = await getSettings();
              await browser.tabs
                .sendMessage(tabId, {
                  type: 'SLOP_RESULT',
                  verdict: result.verdict,
                  provider: settings.activeProvider,
                })
                .catch(() => {});
            } else {
              await browser.tabs
                .sendMessage(tabId, {
                  type: 'SLOP_ERROR',
                  message: result.message,
                })
                .catch(() => {});
            }
          })
          .catch(() => {
            void browser.tabs
              .sendMessage(tabId, {
                type: 'SLOP_ERROR',
                message: "Couldn't analyze the text: something went wrong. Please try again.",
              })
              .catch(() => {});
          });
      })();
    });
  },
});
