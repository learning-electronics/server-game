const { read } = require("fs");

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

loadExercises();

var connections = [];

var users = [];

var rooms = ["None"];

var chat = {};

var rooms_idx = {};

var rooms_started = {};

var last_room = null;

var rooms_settings = {};

var rooms_users = {"None":{}};   // {room_name : [socketids]}

//var p_ready=0;

//var players=0;

Socketio.on("connection", socket => {
    

    rooms_users["None"][socket.id] = false;

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
        delete rooms_users["None"][socket.id];
       
        var room_id = null;
        for (var room in rooms_users) {
            if (Object.keys(rooms_users[room])!=null) {
                if (Object.keys(rooms_users[room]).includes(socket.id)) {
                    room_id=room;
                }
            }
        }
        p_ready = 0;
        for(var key in rooms_users[room_id]) {
            if(rooms_users[room_id][key] == true) {
                p_ready++;
            }
        }
        if (p_ready >0) {
            p_ready--;
        }
        Socketio.to(room_id).emit("players_ready", p_ready);

        if (rooms_users[room_id]!=null) {
            total_players=(Object.keys(rooms_users[room_id]).length);
            Socketio.to(room_id).emit("totalPlayers",total_players);
        } else {
            Socketio.to(room_id).emit("totalPlayers", 0);
        }

        // rooms_users["None"].splice(rooms_users["None"].indexOf(socket.id), 1);
    });

    // Send random question to clients in room
    socket.on("client_get_question", (room_id) => {
        for(let i = 0; i < rooms.length; i++) {
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
    socket.on("createRoom", (socket_id, data) => { 
        loadExercises();
        var tmp = rooms.length;
        rooms.push(data.name);
	    chat[rooms[rooms.length - 1]] = [];
	    var idx = Math.floor(Math.random()* exercises.length);
	    rooms_idx[rooms[rooms.length - 1]] = idx;
	    rooms_started[rooms[rooms.length - 1]] = {state: false, counter: 10};
	    rooms_settings[rooms[rooms.length - 1]] = {numExercises : data.numExercises, exercisesLeft : data.numExercises};

        Socketio.emit("loadRooms", rooms); 
    }); 

    //load chat messages when enters
    socket.on("change_room", (room_id, last_room_tmp) => {

        // change socket id room
        socket.leave(last_room_tmp);

        if(last_room_tmp != "") {
            delete rooms_users[last_room_tmp][socket.id];
            // rooms_users[last_room].splice(rooms_users[last_room].indexOf(socket.id), 1);
        }
        

        socket.join(room_id);

        Socketio.to(socket.id).emit("chat", chat[room_id]);
        Socketio.to(socket.id).emit("question_change_room", exercises[rooms_idx[room_id]]);  
        rooms.forEach( room_name => {
            if(Socketio.sockets.adapter.rooms.get(room_name) != null) {
                var tmp_array_users = Array.from(Socketio.sockets.adapter.rooms.get(room_name));
                var tmp_dicts_users = {};
                for(index in tmp_array_users) {
                    tmp_dicts_users[tmp_array_users[index]] = false; 
                }
                console.log(tmp_dicts_users);

                rooms_users[room_name] = tmp_dicts_users;
                // Array.from(Socketio.sockets.adapter.rooms.get(room_name));
            }
        });

        var l_ready = 0;
        for(var key in rooms_users[last_room_tmp]) {
            if(rooms_users[last_room_tmp][key] == true) {
                l_ready++;
            }
        }
        Socketio.to(last_room_tmp).emit("players_ready",l_ready);

        if (rooms_users[room_id]!=null) {
            players=(Object.keys(rooms_users[room_id]).length);
            Socketio.to(room_id).emit("totalPlayers",players);
        }

        if (rooms_users[last_room_tmp]!=null) {
            players=(Object.keys(rooms_users[last_room_tmp]).length);
            Socketio.to(last_room_tmp).emit("totalPlayers",players);
        }

        var p_ready = 0;
        for(var key in rooms_users[room_id]) {
            if(rooms_users[room_id][key] == true) {
                p_ready++;
            }
        }

        Socketio.to(room_id).emit("players_ready",p_ready);
        

        if(rooms.includes(room_id)) {
            Socketio.to(socket.id).emit("game_started", rooms_started[room_id]["state"], rooms_started[room_id]["counter"]); 
        }
        console.log(rooms_users);
    });
    
    //send total players in room
    socket.on("client_get_totalPlayers", (room_id) => {
        players=(Object.keys(rooms_users[room_id]).length);
        Socketio.to(room_id).emit("totalPlayers",players);
    });

    //send players ready in room
    
    socket.on("client_get_players_ready", (room_id) => {
        p_ready = 0;
        for(var key in rooms_users[room_id]) {
            if(rooms_users[room_id][key] == true) {
                p_ready++;
            }
        }
        console.log(p_ready);
        Socketio.to(room_id).emit("players_ready", p_ready);
    });

    // starts the game
    socket.on("playerReady", (room_id) => {

        rooms_users[room_id][socket.id] = true;
        var p_ready = 0;
        for(var key in rooms_users[room_id]) {
            if(rooms_users[room_id][key] == true) {
                p_ready++;
            }
        }
        Socketio.to(room_id).emit("players_ready",p_ready);

      
        // console.log(tmp);
        // console.log(typeof(tmp));
        // ready_val=(tmp / Object.keys(rooms_users[room_id]).length) * 100
        
        
        //count elemnts in dict
        if(p_ready == Object.keys(rooms_users[room_id]).length) {
            
            rooms_started[room_id]["state"] = true;
            roomTimer = setInterval(function() {
                checkExercisesLeft(room_id);
                rooms_started[room_id]["counter"] = rooms_started[room_id]["counter"] - 1; 
                console.log(rooms_started[room_id]["counter"]);
                if(rooms_started[room_id]["counter"] >= 0) {
                    Socketio.to(room_id).emit("counter", rooms_started[room_id]["counter"]);
                } else if(rooms_started[room_id]["counter"] == -1) {
                    Socketio.to(room_id).emit("show_result", true);
                    rooms_settings[room_id]["exercisesLeft"]--;
                    console.log(rooms_settings);
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
            Socketio.to(room_id).emit("game_started", true);
        }
          
    });

    //tells the name of the user that connected
    socket.on("nname",username => {
        users[socket.id]=username;
    });  

});

Http.listen(3000, () => {
    console.log("Listening at port 3000!");
});

// checks if there is exercises left on that room.
// if there aren't the game stop on that room.
function checkExercisesLeft(room_id) {
    if(rooms_settings[room_id]["exercisesLeft"] <= 0) {
        clearInterval(roomTimer);
    }
    Socketio.to(room_id).emit("game_over");
}

// gets exercises from the rest api
function loadExercises() {
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
    
        });
    });
}
