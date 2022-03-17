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

var rooms = ["Room1", "Room2", "Room3"];

var chat = {
    "Room1" : [],
    "Room2" : [],
    "Room3" : [],
};

// Questions just for testing purposes
var questions = [
    {id:1, question: "Question1", options: ["a", "b", "c", "d"], answer: "a"},
    {id:2, question: "Question2", options: ["a", "b", "c", "d"], answer: "b"},
    {id:3, question: "Question3", options: ["a", "b", "c", "d"], answer: "c"},
    {id:4, question: "Question4", options: ["a", "b", "c", "d"], answer: "d"}
];

var rooms_idx = {
    "Room1" : Math.floor(Math.random() * questions.length),
    "Room2" : Math.floor(Math.random() * questions.length),
    "Room3" : Math.floor(Math.random() * questions.length),
};

var counter = 11;   // countdown timer value
var last_room = null;

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
        socket.leave(last_room);
    });

    // Send random question to clients in room
    socket.on("client_get_question", (room_id) => {
        // Socketio.to(room_id).emit("server_get_question", questions[room_id]);
        for(let i = 0; i < rooms.length; i++) {
            Socketio.to(rooms[i]).emit("server_get_question", questions[rooms[i]]);
        }
        console.log(rooms_idx)
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
        socket.leave(last_room);
        last_room = room_id;
        socket.join(room_id);
        Socketio.to(socket.id).emit("chat", chat[room_id]);
        Socketio.to(socket.id).emit("question_change_room", questions[rooms_idx[room_id]]); 
    });
    
    // starts the game
    socket.on("start_game", (room_id) => {
        setInterval(function() {
            console.log(counter);
            counter--;
            if(counter >= 0) {
                Socketio.to(room_id).emit("counter", counter);
            } else if(counter == -1) {
                console.log("Showing result!");
                // show the result of the answer
                Socketio.to(room_id).emit("show_result", true);
            } else if(counter == -3) {
                console.log("Reseting!");
        
                Socketio.to(room_id).emit("show_result", false);
        
                // generate another random question for each room
                rooms.forEach(element => { 
                    rooms_idx[element] = Math.floor(Math.random() * questions.length);
                });
                // send the new question for each room 
                rooms.forEach(element => {
                    Socketio.to(element).emit("server_get_question", questions[rooms_idx[element]]);
                });
                console.log(rooms_idx);
                counter = 11; 
            } 
        }, 1000);
    });

    //tells the name of the user that connected
    socket.on("nname",username => {
        users[socket.id]=username;
    });  

});

Http.listen(3000, () => {
    console.log("Listening at port 3000!");
});
   
