import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifestVersion: 3,
  manifest: {
    name: 'Is It Slop?',
    description: 'Select text on any page and check whether it looks AI-generated.',
    permissions: ['storage', 'contextMenus', 'scripting'],
    host_permissions: [
      'https://api.anthropic.com/*',
      'https://api.openai.com/*',
      'https://en.wikipedia.org/*',
    ],
  },
});
