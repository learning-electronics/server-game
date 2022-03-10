const Express = require("express")();
const Http = require("http").Server(Express);
const Socketio = require("socket.io")(Http, {
    cors: {
        origin: "http://localhost:4200",
        methods: ["GET", "POST"]
    }
});

var connections = [];

Socketio.on("connection", socket => {
    connections.push(socket.id);
    Socketio.emit("connections", connections);

    socket.on("disconnect", () => {
        connections.splice(connections.indexOf(socket.id), 1);
        console.log(connections.toString());
        Socketio.emit("connections", connections);
    });

});


Http.listen(3000, () => {
    console.log("Listening at port 3000!");
});
   