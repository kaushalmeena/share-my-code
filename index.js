var express = require('express');
var nunjucks = require('nunjucks');
var app = express();
var path = require('path');

const { addUser, getUser, deleteUser, getUsersInRoom } = require('./utils/users');

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
    title: "Editor"
  });
});

var server = app.listen(PORT, () => {
  console.log("Express server listening on port http://localhost:%d", PORT);
});

var io = require("socket.io")(server);

io.on('connection', (socket) => {
  socket.on('join', ({ name, room }, callback) => {
    const { user, error } = addUser(socket.id, name, room)
    if (error) {
      return callback(error);
    }
    socket.join(user.room)
    socket.in(room).emit('notification', { title: 'Someone\'s here', message: `${user.name} just entered the room` })
    io.in(room).emit('peopleChange', getUsersInRoom(room));
    callback();
  })


  socket.on('sendMessage', (message) => {
    const user = getUser(socket.id)
    if (user) {
      socket.in(user.room).emit('message', { username: user.name, message: message });
    }
  });

  socket.on('updateCode', (code) => {
    const user = getUser(socket.id)
    if (user) {
      socket.in(user.room).emit('codeChange', { code: code });
    }
  });

  socket.on("disconnect", () => {
    const user = deleteUser(socket.id)
    if (user) {
      io.in(user.room).emit('notification', { title: 'Someone just left', message: `${user.name} just left the room` })
      io.in(user.room).emit('peopleChange', getUsersInRoom(user.room))
    }
  });
});
