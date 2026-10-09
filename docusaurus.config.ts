import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// Node.js build-time config — no browser APIs here.

const config: Config = {
  title: 'Talk2View Docs',
  tagline: 'Add AI-powered natural-language control to your app in a few lines of code.',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://docs.talk2view.com',
  baseUrl: '/',

  // GitHub Pages deployment (Talk2View/docs). Custom domain via static/CNAME.
  organizationName: 'Talk2View',
  projectName: 'docs',
  trailingSlash: false,

  onBrokenLinks: 'throw',

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          // Serve the docs at the site root — docs.talk2view.com shows them directly.
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/Talk2View/docs/tree/main/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Talk2View',
      items: [
        {type: 'docSidebar', sidebarId: 'docs', position: 'left', label: 'Docs'},
        {href: 'https://engine.talk2view.com/docs', label: 'API reference', position: 'left'},
        {
          href: 'https://talk2view.com/resources/contact?subject=partner-key',
          label: 'Request a key',
          position: 'right',
        },
        {
          href: 'https://github.com/Talk2View/talk2view-typescript',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {label: 'Getting started', to: '/getting-started'},
            {label: 'Authentication', to: '/authentication'},
            {label: 'Concepts', to: '/concepts'},
          ],
        },
        {
          title: 'Build',
          items: [
            {label: 'Request a partner key', href: 'https://talk2view.com/resources/contact?subject=partner-key'},
            {label: 'TypeScript SDK (npm)', href: 'https://www.npmjs.com/package/@talk2view/sdk'},
            {label: 'API reference', href: 'https://engine.talk2view.com/docs'},
          ],
        },
        {
          title: 'More',
          items: [
            {label: 'talk2view.com', href: 'https://talk2view.com'},
            {label: 'GitHub', href: 'https://github.com/Talk2View'},
          ],
        },
      ],
      copyright: 'Copyright © 2026 A2B Technology Corporation Pty Ltd.',
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'python'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
