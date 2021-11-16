var express = require('express');
var nunjucks = require('nunjucks');
var app = express();
var path = require('path');

var isDev = app.get('env') === 'development';

var PORT = 3000;

var PUBLIC_FOLDER = path.join(__dirname, 'public');
var VIEWS_FOLDER = path.join(__dirname, 'views');

nunjucks.configure('views', {
  autoescape: true,
  express: app,
  watch: isDev,
  noCache: isDev
});

app.use('/', express.static(PUBLIC_FOLDER));

app.set('views', VIEWS_FOLDER);
app.set('view engine', 'html');

app.get('/new-editor/', function (req, res) {
  const newRoomId = Math.random().toString(16).substring(8);
  res.redirect(`/editor/${newRoomId}/`);
});

app.get('/', function (req, res) {
  res.render('home', {
    title: "Home"
  });
});

app.get('/editor/:roomId/', function (req, res) {
  res.render('editor', {
    title: "Editor",
    roomId: req.params.roomId
  });
});

var server = app.listen(PORT, function () {
  console.log("Express server listening on port http://localhost:%d", this.address().port);
});

// var io = require("socket.io")(server);

// io.on('connection', function (socket) {
//   socket.on('connected', function (data) {
//     io.sockets.emit('connected', {
//       username: data.username
//     });
//   });

//   socket.on('message', function (data) {
//     io.sockets.emit('message', {
//       userId: data.userId,
//       message: data.message,
//       username: data.username
//     });
//   });

//   socket.on('disconnected', function (data) {
//     io.sockets.emit('disconnected', {
//       username: data.username
//     });
//   });
// });