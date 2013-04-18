var express = require("express");
var app = express();
var root = "/www";

var io = require('socket.io').listen(3000);

var fs = require("fs");
var path = require("path");
var flash = require("connect-flash");
var passport = require('passport');
var PassportLocalStrategy = require('passport-local').Strategy;

app.configure(function(){
    app.use(express.cookieParser());
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.session({ secret: 'secretstuffs' }));
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(flash());
    app.use(app.router);
	app.use("/", express.static(__dirname + root));
	app.get("/", function(request, response) { response.render(root + "/index.html");});
});

function serveStaticFile(request, response) {
    if (request.user !== undefined){
        response.cookie("user", request.user.id);
    }
    else {
        response.cookie("user", "none");
    }
    console.log("user:", request.user);
    response.sendfile("www/" + request.params.staticFilename);
}

app.get("/:staticFilename", serveStaticFile);

app.listen(8080);
process.on("uncaughtException", onUncaughtException);

app.post('/login', 
		 passport.authenticate('local', {
			successRedirect: '/controller.html',
		 	failureFlash: true
		}),
		 function() {
		 });
								   
var idToUser = [
    { id: 0, username: 'bob', password: 'secret' },
	{ id: 1, username: 'andy', password: 'password'}
];
var usernameToId = { 'bob': 0, 'andy': 1 };

passport.use(new PassportLocalStrategy(
    function(username, password, done) {
        var user = idToUser[usernameToId[username]];
        if (user === undefined)
            return done(null, false, { message: 'Unknown user ' + username });
        if (user.password !== password)
            return done(null, false, { message: 'Invalid password' });
        return done(null, user);
    }
));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    done(null, idToUser[id]);
});

function gameSockets() {
	this.players = {1: null, 2:null};
	this.gameStarted = false;
	
	io.sockets.on('connection', function(socket){
		console.log("!!!!!!!");
		socket.on('controller', function(data) {
			io.sockets.emit('paddlemove', data);
		});
		socket.on('connectControl', function() {
			var player;
			if (this.players[1]===null) {
				this.players[1] = socket;
				player = 1;
				socket.emit("controlConnected", {"player":1});
			} else if (this.players[2]===null) {
				this.players[2] = socket;
				player = 2
				socket.emit("controlConnected", {"player":2});
			} else {
				socket.emit("controlConnected", {"player":0});
				player = 0;
			}
			socket.on('disconnect', function() {
				if (player!==0) {
					this.players[player] = null;
					io.sockets.emit("gameEnd", {"disconnect": true});
					this.gameStarted = false;
				}
			}.bind(this))
			if (this.players[1]!==null && this.players[2]!==null && !this.gameStarted) {
				io.sockets.emit("gameStart");
				this.gameStarted = true;
			}
		}.bind(this));
		socket.on("gameWon", function() {
			this.gameStarted = false;
			io.sockets.emit("gameEnd", {"disconnect": false});
		}.bind(this))
	}.bind(this));
}

new gameSockets();

function onUncaughtException(err) {
    var err = "uncaught exception: " + err;
    console.log(err);
}