# Is It Slop?

*Spoiler: probably, but let's find out.*

A browser extension (Chrome + Firefox) that lets you select text on any web page, right-click, and ask "Is it slop?" —
an AI judgment of whether the selected text looks AI-generated. Uses your own Anthropic or OpenAI API key; no backend,
no data collection.

## Setup

1. `npm install`
2. `npm run dev` (Chrome) or `npm run dev:firefox` (Firefox) — opens a browser with the extension loaded and
   hot-reloading.
3. Open the extension's options page and enter an API key for Anthropic or OpenAI. The key is validated live and stored
   only in your browser's local extension storage — it is never sent anywhere except directly to the provider you chose.
4. Select text on any page, right-click, and choose "Is it slop?".

## Development

- `npm test` — run the unit test suite (Vitest).
- `npm run compile` — typecheck without emitting.
- `npm run build` / `npm run build:firefox` — production build.
- `npm run zip` / `npm run zip:firefox` — build and package for store submission.

## Architecture

`lib/` holds plain, unit-tested TypeScript (storage, Wikipedia criteria caching, provider clients, analysis orchestration); 
`entrypoints/` holds the WXT-specific glue (background service worker, content script, options page) that wires that logic 
to browser APIs.

## Security model

This extension calls the Anthropic and OpenAI APIs directly from the browser using your own API key
(`dangerouslyAllowBrowser: true` on both SDKs). That's safe here because the key is yours, stays in your own browser's
local storage, and is sent only to the provider you configured — never to any third party or telemetry endpoint.
