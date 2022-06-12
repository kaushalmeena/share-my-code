const express = require("express");
const compression = require("compression");
const nunjucks = require("nunjucks");
const path = require("path");
const http = require("http");

const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server);

const userStore = require("./store/user");

const DEVELOPMENT_MODE = app.get("env") === "development";

const PORT = process.env.PORT || 3000;

const PUBLIC_FOLDER = path.join(__dirname, "public");
const VIEWS_FOLDER = path.join(__dirname, "views");

nunjucks.configure("views", {
  autoescape: true,
  express: app,
  watch: DEVELOPMENT_MODE,
  noCache: DEVELOPMENT_MODE,
});

app.use(compression());
app.use("/", express.static(PUBLIC_FOLDER));

app.set("views", VIEWS_FOLDER);
app.set("view engine", "html");

app.get("/new-editor/", (req, res) => {
  const newRoom = Math.random().toString(16).substring(8);
  res.redirect(`/editor/${newRoom}/`);
});

app.get("/", (req, res) => {
  res.render("home", {
    title: "Home",
  });
});

app.get("/editor/:room/", (req, res) => {
  res.render("editor", {
    title: "Editor",
    room: req.params.room,
  });
});

server.listen(PORT, () => {
  console.log("Express server listening on port http://localhost:%d", PORT);
});

io.on("connection", (socket) => {
  socket.on("join", ({ name, room }, callback) => {
    const { user, error } = userStore.addUser(socket.id, name, room);
    if (error) {
      return callback(error);
    }
    const usersInRoom = userStore.getUsersInRoom(room);
    socket.join(user.room);
    socket.in(room).emit("notification", `${user.name} just entered the room`);
    io.in(room).emit("usersChange", usersInRoom);
    return callback();
  });

  socket.on("sendMessage", (message) => {
    const user = userStore.getUser(socket.id);
    if (user) {
      socket.in(user.room).emit("message", { username: user.name, message });
    }
  });

  socket.on("updateCode", (code) => {
    const user = userStore.getUser(socket.id);
    if (user) {
      socket.in(user.room).emit("codeChange", code);
    }
  });

  socket.on("disconnect", () => {
    const user = userStore.deleteUser(socket.id);
    if (user) {
      const usersInRoom = userStore.getUsersInRoom(user.room);
      io.in(user.room).emit("notification", `${user.name} just left the room`);
      io.in(user.room).emit("usersChange", usersInRoom);
    }
  });
});
