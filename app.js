const Express = require("express")();
const Http = require("http").Server(Express);
const Socketio = require("socket.io")(Http, {
    cors: {
        origin: "http://localhost:4200",
        methods: ["GET", "POST"]
    }
});

var connections = [];

var users = [];

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
        users.splice(users[socket.id],1);
        Socketio.emit("connections", connections);
    });
    
    // store chat messages
    socket.on("send_message", (data, room_id) => {
        socket.join(room_id);
        chat[room_id].push({'src': users[socket.id] , 'data': data});
        Socketio.to(room_id).emit("chat", chat[room_id]);
        console.log(chat);
    });
    
    //load chat messages when enters
    socket.on("change_room", room_id => {
        socket.join(room_id);
        Socketio.to(socket.id).emit("chat", chat[room_id]);
        console.log(chat[room_id]);
        console.log(room_id);
    });

    //tells the name of the user that connected
    socket.on("nname",username =>{
        users[socket.id]=username;
    });
    
});


Http.listen(3000, () => {
    console.log("Listening at port 3000!");
});
   
