<div align="center">

# Share My Code

[![License: MIT](https://img.shields.io/badge/License-MIT-3DA639?logo=opensourceinitiative&logoColor=white)](LICENSE) [![Node.js](https://img.shields.io/badge/Node.js-lts-5FA04E?logo=node.js&logoColor=white)](https://nodejs.org/) [![socket.io](https://img.shields.io/badge/socket.io-latest-4C6EF5?logo=socket.io&logoColor=white)](https://socket.io/)

**Realtime code editor sharing with socket.io.**

A web app that lets you share a code editor in realtime with others — type
together, see each other's changes instantly, powered by
[socket.io](https://socket.io/).

[**Try it live**](https://sharemycode.onrender.com/)

</div>

---

## Features

- **Realtime syncing** — multiple users edit the same code simultaneously with
  instant updates via socket.io.
- **Simple sharing** — share a link and start coding together immediately.
- **Lightweight** — minimal setup, no account required.

## Tech Stack

| Area          | Tools                                                                 |
| ------------- | --------------------------------------------------------------------- |
| **Framework** | [Node.js](https://nodejs.org/) · [Express](https://expressjs.com/)    |
| **Realtime**  | [socket.io](https://socket.io/)                                       |
| **Tooling**   | [npm](https://www.npmjs.com/)                                         |

## Getting Started

These instructions will get you a copy of the project up and running on your
local machine for development purposes.

### Requirements

To install and run this project you need:

- [Node.js](https://nodejs.org/)
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

## Contributing

Contributions are welcome! If you find a bug or have a feature request, please
[open an issue](https://github.com/kaushalmeena/myapp-sharemycode/issues/new/choose)
first to discuss it. For code changes, fork the repository, create a branch,
and open a pull request.

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE)
file for details.
