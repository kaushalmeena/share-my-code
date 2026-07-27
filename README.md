<div align="center">

<img src="static/icon.svg" alt="ShareMyCode logo" width="96" height="96" />

# ShareMyCode

[![License: MIT](https://img.shields.io/badge/License-MIT-3DA639?logo=opensourceinitiative&logoColor=white)](LICENSE) [![SvelteKit](https://img.shields.io/badge/SvelteKit-2-FF3E00?logo=svelte&logoColor=white)](https://svelte.dev/docs/kit) [![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-4C6EF5?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/) [![Yjs](https://img.shields.io/badge/Yjs-13-5F3DC4)](https://yjs.dev/)

**A collaborative code pad. Create one, share the link, edit together.**

Realtime editing with live cursors and conflict-free merging, built on [Yjs](https://yjs.dev/) CRDTs and [CodeMirror 6](https://codemirror.net/).
No account, nothing to install, and **nothing is lost** when you reload or
drop offline.

[**Try it live**](https://sharemycode.onrender.com/)

</div>

---

## Features

- **Conflict-free editing** — a CRDT merges concurrent edits, so two people can
  type on the same line without overwriting each other.
- **Nothing gets lost** — every pad is cached in your browser and held
  authoritatively on the server, so a reload, a dropped connection, or a server
  restart all recover.
- **Offline tolerant** — keep typing with the network down; changes merge on
  reconnect.
- **Live presence** — see who is in the pad and where their cursor is, each
  person in their own colour.
- **Host controls** — whoever creates a pad can make it read-only for everyone
  else, enforced by the server rather than just hidden in the UI.
- **25 languages, 4 themes** — grammars load on demand, so the initial download
  stays small.

## How It Works

1. **Create a pad** — the server mints a short room id and a one-time host
   token that only your browser keeps.
2. **Share the link** — anyone who opens it joins the same document; no sign-in
   and no invitation step.
3. **Edit together** — keystrokes become CRDT updates that merge in any order,
   relayed over a WebSocket and mirrored into each browser's IndexedDB.
4. **Come back later** — the server keeps the authoritative copy on disk, so a
   late joiner or a fresh device gets the full pad.

> The relay is a small WebSocket server bundled into this app — no third-party
> service, and it only ever forwards binary diffs. A pure peer-to-peer version
> would still need signalling and TURN servers, and the pad would vanish once
> the last tab closed.

## Tech Stack

| Area          | Tools                                                                                                                        |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Framework** | [SvelteKit 2](https://svelte.dev/docs/kit) · [Svelte 5](https://svelte.dev/) · [TypeScript](https://www.typescriptlang.org/) |
| **Editor**    | [CodeMirror 6](https://codemirror.net/) · [y-codemirror.next](https://github.com/yjs/y-codemirror.next)                      |
| **Realtime**  | [Yjs](https://yjs.dev/) · [y-websocket](https://github.com/yjs/y-websocket) · [ws](https://github.com/websockets/ws)         |
| **Styling**   | [Tailwind CSS 4](https://tailwindcss.com/) · [Lucide](https://lucide.dev/)                                                   |
| **Tooling**   | [Vite](https://vite.dev/) · [ESLint](https://eslint.org/) · [Prettier](https://prettier.io/)                                 |
| **Hosting**   | [Docker](https://www.docker.com/) · [Node.js](https://nodejs.org/)                                                           |

## Getting Started

These instructions will get you a copy of the project up and running on your
local machine for development purposes.

### Requirements

To install and run this project you need:

- [Node.js](https://nodejs.org/) 20 or newer
- [npm](https://www.npmjs.com/)
- [git](https://git-scm.com/downloads) (only to clone this repository)

### Installation

To set up everything on your local machine, follow these steps:

1. Clone this repo and then change directory to the `myapp-sharemycode` folder:

```bash
git clone https://github.com/kaushalmeena/myapp-sharemycode.git
cd myapp-sharemycode
```

2. Install project dependencies using npm:

```bash
npm install
```

### Running

To run the project simply run:

```bash
npm run dev
```

Your app should now be running on [localhost:3000](http://localhost:3000/).
The collaboration relay is mounted on the same server, so there is only one
process and one port to worry about.

### Testing

To type-check the project:

```bash
npm run check
```

To lint and check formatting:

```bash
npm run lint
```

With a dev server running, this exercises the host edit lock end to end over
real WebSockets — that it holds against a client ignoring the read-only UI:

```bash
node scripts/check-locks.js
```

### Building

To create a production build:

```bash
npm run build
```

The build output is written to the `build` folder. Serve it with `npm start`,
which runs `server.js` — the app owns its HTTP server so it can handle both
page requests and WebSocket upgrades.

## Deployment

The [Dockerfile](Dockerfile) builds a self-contained image:

```bash
docker build -t sharemycode .
docker run -p 3000:3000 -v sharemycode-data:/data sharemycode
```

Mount a persistent volume at `/data` — pad snapshots are written there, and on
an ephemeral filesystem every pad is lost on restart. Everything else has a
working default; the settings are listed in
[Configuration](docs/architecture.md#configuration).

> Run a **single instance**. The relay keeps rooms in memory, so two instances
> would each hold a copy of the same pad and diverge permanently. See the
> [scaling notes](docs/architecture.md#scaling) for the ways around it.

## Documentation

- **[Architecture](docs/architecture.md)** — the three sync layers, the
  WebSocket protocol and its one sharp edge, how host permissions are enforced,
  persistence, and the limits worth knowing before scaling it.
- **[Design](docs/design.md)** — colour tokens and theming, typography, motion,
  component conventions, and the accessibility commitments.

## Contributing

Contributions are welcome! If you find a bug or have a feature request, please
[open an issue](https://github.com/kaushalmeena/myapp-sharemycode/issues/new/choose)
first to discuss it. For code changes, fork the repository, create a branch,
and open a pull request.

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE)
file for details.
