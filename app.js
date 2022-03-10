const Express = require("express")();
const Http = require("http").Server(Express);
const Socketio = require("socket.io")(Http, {
    cors: {
        origin: "http://localhost:4200",
        methods: ["GET", "POST"]
    }
});

var connections = [];

var chat = {
    "Room1" : [],
    "Room2" : [],
    "Room3" : [],
};

Socketio.on("connection", socket => {
    // When a new socket connects its pushed to the connections array
    connections.push(socket.id);
     
    Socketio.emit("socket_id", socket.id);

    // sends all the socket connections
    Socketio.emit("connections", connections);
    
    // when a socket disconnects its removed from the connections array
    socket.on("disconnect", () => {
        connections.splice(connections.indexOf(socket.id), 1);
        console.log(connections.toString());
        Socketio.emit("connections", connections);
    });
    
    // store chat messages
    socket.on("send_message", (data, room_id) => {
        chat[room_id].push({'src': socket.id , 'data': data});
        Socketio.emit("chat", chat[room_id]);
        console.log(chat);
    });
    
    //load chat messages when enters
    socket.on("change_room", room_id => {
        Socketio.emit("chat", chat[room_id]);
        console.log(chat[room_id]);
    });

});


Http.listen(3000, () => {
    console.log("Listening at port 3000!");
});
   
