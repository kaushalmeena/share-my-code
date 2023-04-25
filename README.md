# Share My Code

A web app that facilitates realtime sharing of code editor using socket.io library.

Live version is deployed at [https://myapp-sharemycode.vercel.app/](https://myapp-sharemycode.vercel.app/)

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development purposes. See deployment for notes on how to deploy the project on a live system.

### Requirements

To install and run this project you need:

- [NodeJS](https://nodejs.org/ "NodeJS")
- [git](https://git-scm.com/downloads "git") (only to clone this repository)

### Installation

To set up everything in your local machine, you need to follow these steps:

1. Clone this repo and then change directory to the `myapp-sharemycode` folder:

```bash
$ git clone https://github.com/kaushalmeena/myapp-sharemycode.git
$ cd myapp-sharemycode
```

2. Install project dependencies using npm:

```bash
$ npm install
```

### Running

To run the project simply run:

```bash
$ npm run dev
```

Your app should now be running on [localhost:3000](http://localhost:3000/).

## Deployment

To push to Heroku you need to install the [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) afterwards, you can run these commands after setting up the project locally:

```bash
$ heroku login
$ heroku create
$ git push heroku master
$ heroku open
```

or

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
