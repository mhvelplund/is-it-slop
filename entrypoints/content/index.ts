// entrypoints/content/index.ts
import './style.css';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import { renderVerdictContent } from '@/lib/verdict-content';
import type { Provider, SlopVerdict } from '@/lib/types';

interface SlopLoadingMessage {
  type: 'SLOP_LOADING';
}
interface SlopResultMessage {
  type: 'SLOP_RESULT';
  verdict: SlopVerdict;
  provider: Provider;
}
interface SlopErrorMessage {
  type: 'SLOP_ERROR';
  message: string;
}
type SlopMessage = SlopLoadingMessage | SlopResultMessage | SlopErrorMessage;

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',
  async main(ctx) {
    let activeUi: Awaited<ReturnType<typeof createShadowRootUi>> | undefined;
    let activeCard: HTMLElement | undefined;
    let generation = 0;

    function removeCard() {
      activeUi?.remove();
      activeUi = undefined;
      activeCard = undefined;
    }

    function getSelectionRect(): DOMRect | undefined {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return undefined;
      return selection.getRangeAt(0).getBoundingClientRect();
    }

    async function showCard(fill: (card: HTMLElement) => void) {
      const gen = ++generation;
      removeCard();
      const rect = getSelectionRect();

      const ui = await createShadowRootUi(ctx, {
        name: 'is-it-slop-card',
        position: 'inline',
        anchor: 'body',
        onMount: (container) => {
          const card = document.createElement('div');
          card.className = 'is-it-slop-card';
          card.style.top = `${(rect?.bottom ?? 80) + 8}px`;
          card.style.left = `${rect?.left ?? 24}px`;
          container.appendChild(card);
          fill(card);
          return card;
        },
      });

      if (gen !== generation) {
        ui.remove();
        return;
      }
      activeUi = ui;
      // `onMount` only runs inside `mount()`, so `ui.mounted` is only
      // populated after this call — read it afterwards.
      ui.mount();
      activeCard = ui.mounted as HTMLElement | undefined;
    }

    browser.runtime.onMessage.addListener((message: SlopMessage) => {
      if (message.type === 'SLOP_LOADING') {
        void showCard((card) => {
          card.textContent = 'Checking…';
        });
      } else if (message.type === 'SLOP_RESULT') {
        void showCard((card) => {
          const content = renderVerdictContent(message.verdict, message.provider);
          card.innerHTML = '';
          const strong = document.createElement('strong');
          strong.textContent = `${content.label} (${content.confidenceText})`;
          const reasoning = document.createElement('span');
          reasoning.textContent = content.reasoning;
          const attribution = document.createElement('small');
          attribution.textContent = content.attribution;
          card.append(strong, reasoning, attribution);
        });
      } else if (message.type === 'SLOP_ERROR') {
        void showCard((card) => {
          card.textContent = message.message;
        });
      }
    });

    document.addEventListener('mousedown', (event) => {
      if (!activeCard) return;
      const path = event.composedPath();
      if (!path.includes(activeCard)) {
        removeCard();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') removeCard();
    });

    document.addEventListener('selectionchange', () => {
      // A brand-new selection should dismiss a stale card rather than leave
      // it anchored to the old selection's now-stale position.
      const selection = window.getSelection();
      if (activeCard && (!selection || selection.toString().length === 0)) {
        removeCard();
      }
    });
  },
});
