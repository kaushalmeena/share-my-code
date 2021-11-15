var socket;
var userId;
var username = "";

$(document).ready(function () {
  socket = io.connect(location.protocol + '//' + location.host);
  userId = Math.random().toString(36).substr(2, 8);

  socket.on("connected", function (data) {
    $("#chatGroup").append('<div class="text-center">' + data.username + ' has joined chat group.</div>');
  });

  socket.on("message", function (data) {
    var date = new Date();
    var time = date.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });

    if (data.userId === userId) {
      $("#chatGroup").append('<div class="bubble bubble-right shadow-sm"><div class="px-3 py-1"><div class="text-left"><small class="text-muted">~' + data.username + '</small></div><div class="text-left">' + data.message + '</div><div class="text-left"><small class="text-muted">' + time + '</small></div></div></div>');
    } else {
      $("#chatGroup").append('<div class="bubble bubble-left shadow-sm"><div class="px-3 py-1"><div class="text-right"><small class="text-muted">~' + data.username + '</small></div><div class="text-left">' + data.message + '</div><div class="text-right"><small class="text-muted">' + time + '</small></div></div></div>');
    }

    $("#chatGroup").animate({ scrollTop: $("#chatGroup").height() }, 500);
  });

  socket.on("disconnected", function (data) {
    $("#chatGroup").append('<div class="text-center">' + data.username + ' has left the chat group.</div>');
  });

  $("#pageLoader").fadeOut('fast');

  $("#chatModal").modal('show');
});

$(window).on('beforeunload', function () {
  socket.emit('disconnected', { username: username });
});

$("#sendButton").click(function () {
  socket.emit('message', {
    userId: userId,
    username: username,
    message: $("#chatInput").val()
  });

  $("#chatInput").val("");
});

$("#chatInput").keypress(function (e) {
  if (e.which == 13) {
    $("#sendButton").click();
  }
});

$("#chatForm").submit(function () {
  username = $("#formUsername").val();

  socket.emit('connected', { username: username });

  $("#chatModal").modal('hide');

  return false;
});
