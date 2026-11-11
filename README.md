# Website

This website is built using [Docusaurus](https://docusaurus.io/), a modern static website generator.

## Installation

```bash
npm install
```

**Note**: feel free to use the package manager of your choice.

## SDK reference pages

`docs/typescript/` and `docs/python/` carry the content of the two SDK READMEs
([talk2view-typescript](https://github.com/Talk2View/talk2view-typescript) and
[talk2view-python](https://github.com/Talk2View/talk2view-python)), split into pages.
The first page of each section names the SDK version it describes. When an SDK
release changes its README, update the matching pages here, that version line, and
the version in `static/llms.txt`.

## Local Development

```bash
npm run start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

## Build

```bash
npm run build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

## Deployment

Using SSH:

```bash
USE_SSH=true npm run deploy
```

Not using SSH:

```bash
GIT_USER=<Your GitHub username> npm run deploy
```

If you are using GitHub Pages for hosting, this command is a convenient way to build the website and push to the `gh-pages` branch.
