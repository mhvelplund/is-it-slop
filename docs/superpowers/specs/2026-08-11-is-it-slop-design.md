# Is It Slop? — Design Spec

**Date:** 2026-08-11
**Status:** Approved for planning

## Summary

A cross-browser (Chrome + Firefox) extension that lets a user select text on any
web page, right-click, and ask "Is it slop?" — an AI judgment of whether the
selected text was AI-generated. The user brings their own API key for either
Anthropic or OpenAI; the extension calls a small/cheap model from that
provider directly from the browser, using criteria scraped from Wikipedia's
["Signs of AI writing"](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing)
page as grounding.

## Goals

- Settings panel: choose a provider (Anthropic or OpenAI), enter an API key,
  see live validation (green check / red X).
- Right-click context menu item ("Is it slop?") on selected text, enabled only
  when the active provider has a valid key.
- Clicking it calls a small model (Claude Haiku or GPT-mini) with the
  Wikipedia signs-of-AI-writing criteria and the selected text, and shows a
  verdict + confidence + short reasoning in a floating card near the
  selection.
- Criteria text is fetched from Wikipedia and cached locally for 24 hours.

## Non-goals

- No backend/proxy server — all API calls happen directly from the browser
  extension using the user's own key.
- No end-to-end browser automation testing for v1.
- No multi-key-per-provider support, no team/shared-key features.

## Architecture

- **Framework:** [WXT](https://wxt.dev) — TypeScript-first, cross-browser
  WebExtension framework. Generates per-browser `manifest.json` (MV3),
  abstracts Chrome/Firefox differences (e.g. background service worker vs.
  Firefox's event-page equivalent), provides dev hot-reload and build/zip
  tooling for both browsers.
- **UI:** React for the options/settings page only. The in-page verdict card
  is hand-built with vanilla DOM + Shadow DOM (no framework needed for
  something this small, and it keeps the content-script bundle light).
- **Language:** TypeScript throughout.
- **Entry points:**
  - `background` — service worker. Owns the context menu, the provider
    abstraction, and orchestrates the analysis flow.
  - `content` — persistent content script injected on all pages. Listens for
    messages from `background` and renders the floating verdict card.
  - `options` — React app for provider selection + API key entry/validation.
- **Storage:** `browser.storage.local` only. Never `storage.sync` — API keys
  must not leave the device via browser-account sync.
- **Permissions:** `contextMenus`, `storage`, and `host_permissions` for
  `https://api.anthropic.com/*`, `https://api.openai.com/*`, and
  `https://en.wikipedia.org/*`.
- **Calling AI APIs directly from the browser:** Both the Anthropic and
  OpenAI SDKs refuse browser usage by default (the guard exists to stop
  accidental key exposure on public web pages). That risk doesn't apply here
  — the key belongs to the user running the extension, is stored only in
  their own browser, and is sent only to that provider's API — so each SDK
  client is constructed with its "allow browser" escape hatch
  (`dangerouslyAllowBrowser: true` on the Anthropic SDK; the OpenAI SDK's
  equivalent option), with a code comment explaining why this is safe in this
  context. `host_permissions` for the API domains is also what gives the
  extension's background service worker MV3's cross-origin-fetch exemption,
  so these calls work without a backend proxy.

## Data Model

Stored in `browser.storage.local`:

```ts
interface StoredSettings {
  activeProvider: 'anthropic' | 'openai';
  apiKeys: {
    anthropic?: string;
    openai?: string;
  };
  keyValidity: {
    anthropic?: 'valid' | 'invalid' | 'unverified';
    openai?: 'valid' | 'invalid' | 'unverified';
  };
}

interface CriteriaCache {
  criteriaText: string;
  fetchedAt: number; // epoch ms
}
```

Both providers' keys and validity states are retained simultaneously, so
switching the active provider doesn't discard the other provider's
previously-entered key.

## Settings Page & API Key Validation

- Provider selector (Anthropic / OpenAI) + a password-masked API key field for
  whichever provider is selected.
- Status indicator next to the field: green check (valid), red X (invalid),
  spinner (validating), gray dash (empty / not yet validated).
- Validation fires ~800ms after typing stops, or on blur — whichever happens
  first (debounced, not on every keystroke).
- **Validation call:** neither provider has a dedicated "check this key"
  endpoint. Use the cheapest real authenticated call: `GET /v1/models`
  (`client.models.list()` on both SDKs). No token cost, validates auth only.
  - 401/403 → **invalid** (red X).
  - Success → **valid** (green check).
  - Network error / 5xx / rate limit → **unverified** (distinct from
    invalid — a transient network blip must not red-X a good key). Shown as
    a small "couldn't verify" state.
- Saving a key immediately triggers a context-menu `enabled` sync in the
  background script (see below), even before validation completes.

## Wikipedia Criteria Caching

- **Source:**
  `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&titles=Wikipedia:Signs_of_AI_writing&format=json`
  — the MediaWiki Action API's `extracts` prop with `explaintext=1` returns
  the full page as clean plain text, ready to drop into a system prompt with
  no HTML/wikitext parsing needed.
- **Cache:** `browser.storage.local` holds `{ criteriaText, fetchedAt }`.
  Before each analysis call: if `Date.now() - fetchedAt < 24h`, reuse the
  cached text with no network call.
- **Refresh & fallback chain:** if stale or absent, fetch fresh. On fetch
  failure (offline, Wikipedia down, page restructured), fall back to whatever
  is cached — even if stale. Only fall back further, to a **bundled
  snapshot** (a plain-text file shipped with the extension, captured at build
  time), if there is no cache at all yet (e.g. fresh install with no
  network). This guarantees the feature always has *some* criteria to work
  with.

## Context Menu, Analysis Flow & Verdict Card

**Context menu:**

- One item, `"Is it slop?"`, `contexts: ["selection"]` (only shows on a text
  selection), created once on install.
- `enabled` state tracks `keyValidity[activeProvider] === 'valid'`, kept in
  sync via `browser.contextMenus.update()` — on startup (reading storage) and
  on every `storage.onChanged` event in the background script. If the active
  provider has no valid key, the item is visible but grayed out.

**Analysis flow:**

1. User selects text, right-clicks, clicks "Is it slop?".
2. `contextMenus.onClicked` fires in the background script with
   `info.selectionText` and the tab ID.
3. Background immediately sends a `SLOP_LOADING` message to the content
   script in that tab so a spinner card appears right away, anchored near the
   selection (selection position is read client-side via the Selection API in
   the content script — background has no DOM access).
4. Background loads the active provider + key + cached criteria, truncates
   selected text to ~8,000 characters (bounds latency/cost; plenty for a
   paragraph-or-few use case), and calls that provider's `evaluateText()`.
5. Provider call requests **structured output** (JSON schema) so the shape is
   consistent across providers:

   ```ts
   interface SlopVerdict {
     verdict: 'likely_ai' | 'likely_human' | 'unclear';
     confidence: number;         // 0-100
     reasoning: string;          // 1-2 sentences
     matchedCriteria: string[];  // short labels, e.g. "excessive em-dashes"
   }
   ```

   - **Anthropic:** model `claude-haiku-4-5`. Criteria text goes in the
     system prompt with `cache_control: { type: "ephemeral" }` — since
     criteria only changes once a day, repeated checks within the cache
     window skip reprocessing that block.
   - **OpenAI:** model `gpt-5-mini`. Structured output via the OpenAI SDK's
     JSON-schema response format (exact call shape confirmed against the
     OpenAI SDK during implementation, since no OpenAI API reference was
     available during design).
6. Background sends `SLOP_RESULT` (or `SLOP_ERROR`) to the content script,
   replacing the spinner with the verdict card.

**Verdict card** (content script, Shadow DOM):

- Small floating card anchored near the end of the text selection.
- Shows: verdict label ("Likely AI-generated" / "Likely human-written" /
  "Unclear"), confidence %, 1–2 sentence reasoning, and a small attribution
  line ("via Claude Haiku" / "via GPT-5 mini").
- Dismissed by clicking outside it, pressing Escape, or making a new
  selection.

**Error states** (shown in the same card, not separate UI):

- No valid key for the active provider → prompt to set one up in settings.
- API error (rate limit, provider outage, etc.) → short message with the
  error class; no automatic retry — user can just click the menu item again.
- Empty/whitespace-only selection → guarded against, though normally
  unreachable since the menu only appears on a real selection.

## Testing Strategy

- **Unit tests** (Vitest, bundled with WXT's Vite tooling): criteria caching
  logic (mocked `fetch` + mocked storage — freshness checks, fallback chain),
  provider response parsing, and key-validation status mapping.
- **Manual QA:** `wxt dev` unpacked loads in both Chrome and Firefox;
  exercise the settings page, context-menu enable/disable sync, and the
  verdict card on a few real pages.
- No end-to-end browser automation for v1.

## Open Items for Implementation

- Confirm exact OpenAI SDK call shape for structured JSON output with
  `gpt-5-mini` (Responses API vs. Chat Completions API) — not verified during
  design since no OpenAI API reference was loaded.
- Confirm `gpt-5-mini` is the correct/available model ID at implementation
  time; it was chosen by the user without a live model reference to check
  against.
- Icon/branding assets are out of scope for this spec — placeholder icons are
  fine for v1.
- Store/AMO listing and distribution are out of scope for this spec.
