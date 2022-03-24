const Express = require("express")();
const Http = require("http").Server(Express);
const Socketio = require("socket.io")(Http, {
    cors: {
        origin: "http://localhost:4200",
        methods: ["GET", "POST"]
    }
});

// {teacher: int, theme:[int], question:string, ans1:string, ans2:string, ans3:string, correct:string, unit:string, resol:string, date:string, img:string}
var exercises = [];

// gets exercises from the rest api
const http = require("http");

http.get("http://127.0.0.1:8000/exercise/api/exercises", (resp) => {
    let data = "";

    resp.on("data", (chunk) => {
        data += chunk;
    });
    resp.on("end", () => {
        
        for(let i = 0; i < JSON.parse(data).length; i++) {
            exercises.push(JSON.parse(data)[i]);
        }

        console.log(exercises);
    });
});

var connections = [];

var users = [];

var rooms = ["None"];

var chat = {};

var rooms_idx = {};

var rooms_started = {};

// Questions just for testing purposes
var questions = [
    {id:1, question: "Question1", options: ["a", "b", "c", "d"], answer: "a"},
    {id:2, question: "Question2", options: ["a", "b", "c", "d"], answer: "b"},
    {id:3, question: "Question3", options: ["a", "b", "c", "d"], answer: "c"},
    {id:4, question: "Question4", options: ["a", "b", "c", "d"], answer: "d"}
];

var last_room = null;

Socketio.on("connection", socket => {
    
    // When a new socket connects its pushed to the connections array
    connections.push(socket.id);

    Socketio.emit("socket_id", socket.id);

    // sends all the socket connections
    Socketio.emit("connections", connections);
    
    // load rooms when connects
    console.log(rooms);
	Socketio.emit("loadRooms", rooms);
    
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
            // Socketio.to(rooms[i]).emit("server_get_question", questions[rooms[i]]);
            Socketio.to(rooms[i]).emit("server_get_question", exercises[rooms[i]]);
        }
    });    
    
    // store chat messages
    socket.on("send_message", (data, room_id) => {
        socket.join(room_id);
        chat[room_id].push({'src': users[socket.id] , 'data': data});
        Socketio.to(room_id).emit("chat", chat[room_id]);
        console.log(chat);
    });
    
    // adds the new room to the respective data structures on the server and tells all clients to load the list of rooms
    socket.on("createRoom", name => { 
	    console.log(name);
        console.log(rooms);
        var tmp = rooms.length;
        rooms.push(name.name);
	    console.log(rooms);
	    chat[rooms[rooms.length - 1]] = [];
	    var idx = Math.floor(Math.random()* exercises.length);
	    rooms_idx[rooms[rooms.length - 1]] = idx;
	    rooms_started[rooms[rooms.length - 1]] = {state: false, counter: 10};
	    Socketio.emit("loadRooms", rooms);
    });

    //load chat messages when enters
    socket.on("change_room", room_id => {
        
        socket.leave(last_room);
        last_room = room_id;
        socket.join(room_id);
        Socketio.to(socket.id).emit("chat", chat[room_id]);
        Socketio.to(socket.id).emit("question_change_room", exercises[rooms_idx[room_id]]);  
        console.log(exercises[rooms_idx[room_id]]); 
        if(rooms.includes(room_id)) {
            Socketio.to(socket.id).emit("game_started", rooms_started[room_id]["state"], rooms_started[room_id]["counter"]); 
        }
    });
    
    // starts the game
    socket.on("start_game", (room_id) => {
        rooms_started[room_id]["state"] = true;
        Socketio.to(room_id).emit("game_started", true); 
        setInterval(function() {
            rooms_started[room_id]["counter"] = rooms_started[room_id]["counter"] - 1; 
            console.log(rooms_started[room_id]["counter"]);
            if(rooms_started[room_id]["counter"] >= 0) {
                Socketio.to(room_id).emit("counter", rooms_started[room_id]["counter"]);
            } else if(rooms_started[room_id]["counter"] == -1) {
                Socketio.to(room_id).emit("show_result", true);
            }
            else if(rooms_started[room_id]["counter"] == -3) {
                Socketio.to(room_id).emit("show_result", false);

                // generate another random question for each room
                rooms.forEach(element => { 
                    rooms_idx[element] = Math.floor(Math.random() * exercises.length);
                });
                
                console.log(rooms_idx);
                
                // send the new question for each room 
                rooms.forEach(element => {
                    Socketio.to(element).emit("server_get_question", exercises[rooms_idx[element]]);
                });
                rooms_started[room_id]["counter"] = 11;
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
   
