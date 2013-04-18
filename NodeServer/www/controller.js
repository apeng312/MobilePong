var Accelerometer = function(){
    this.x = 0;
    this.y = 0;
    this.z = 0;
}

Accelerometer.prototype.startListening = function(){
    if (window.ondevicemotion !== undefined){
        this.startListeningDeviceMotion();
    }
    else if (window.navigator.accelerometer !== undefined){
        this.startListeningNavigatorAccelerometer();
    }
    else if (window.ondeviceorientation !== undefined){
        this.startListeningDeviceOrientation();
    }
    else {
        alert('no accelerometer detected! (try arrow keys)');
        this.startListeningKeys();
    }
}

Accelerometer.prototype.startListeningDeviceMotion = function(){
    var timesEventFired = 0;
    var enabled = false;
    var tooBigX = 100; //turns out firefox actually posts devicemotion events 
                        //with random (generally large) numbers
    window.addEventListener('devicemotion', function(event){
        if (event.accelerationIncludingGravity.x !== null &&
            event.accelerationIncludingGravity.y !== null  &&
            event.accelerationIncludingGravity.z !== null &&
            event.accelerationIncludingGravity.x <= tooBigX){
            if (enabled){
                this.x = event.accelerationIncludingGravity.x;
                this.y = event.accelerationIncludingGravity.y;
                this.z = event.accelerationIncludingGravity.z;
            }
            timesEventFired += 1;
            //console.log(event.accelerationIncludingGravity.x);
        }
    }.bind(this));
    setTimeout(function(){
        if (timesEventFired <= 3){
            alert('no accelerometer detected! (try arrow keys)');
            this.startListeningKeys();
        }
        else
            enabled = true;
    }.bind(this),  1000);
}

Accelerometer.prototype.startListeningNavigatorAccelerometer = function(){
    window.navigator.accelerometer.watchAccelerometer(function(event){
        this.x = event.x;
        this.y = event.y;
        this.z = event.z;
    }.bind(this));
}

Accelerometer.prototype.startListeningDeviceOrientation = function(){
    var timesEventFired = 0;
    var enabled = false;
    window.addEventListener('deviceorientation', function(event){
        if (event.alpha !== null || event.beta !== null || event.gamma !== null){
            if (enabled){
                this.x = event.gamma/5;
                this.y = -event.beta/5;
                this.z = event.alpha;
            }
            //console.log(this.x, this.y, this.z);
            timesEventFired += 1;
        }
    }.bind(this));
    setTimeout(function(){
        if (timesEventFired <= 3){
            alert('no accelerometer detected! (try arrow keys)');
            this.startListeningKeys();
        }
        else
            enabled = true;
    }.bind(this),  1000);
}

Accelerometer.prototype.startListeningKeys = function(){
    var namesToKeycodes = {
        up: 38,
        down: 40,
        left: 37,
        right: 39
    };
    window.addEventListener('keydown', function(e){
        var keycode = e.which;
        if (keycode === namesToKeycodes['up'])
            this.y = -2;
        else if (keycode === namesToKeycodes['down'])
            this.y = 2;
        if (keycode === namesToKeycodes['left'])
            this.x = 2;
        else if (keycode === namesToKeycodes['right'])
            this.x = -2;
    }.bind(this));

    window.addEventListener('keyup', function(e){
        var keycode = e.which;
        if (keycode === namesToKeycodes['up'])
            this.y = 0;
        else if (keycode === namesToKeycodes['down'])
            this.y = 0;
        if (keycode === namesToKeycodes['left'])
            this.x = 0;
        else if (keycode === namesToKeycodes['right'])
            this.x = 0;
    }.bind(this));
}

Accelerometer.prototype.getLast = function(){
    if (window.util.isIOS()){
        return {
            x: this.x,
            y: -this.y,
            z: this.z
        };
    }
    else if (window.util.isAndroid() && window.util.isChrome()){
        return {
            x: this.x,
            y: -this.y,
            z: this.z
        };
    }
    else {
        return {
            x: -this.x,
            y: this.y,
            z: this.z
        };
    }
}

window.util = function(){ }

window.util.isIOS = function(){
    return  !!(navigator.userAgent.match(/iPhone/i) ||
            navigator.userAgent.match(/iPod/i) ||
            navigator.userAgent.match(/iPad/i));
}

window.util.isAndroid = function(){
    return !!(navigator.userAgent.match(/Android/));
}

window.util.isChrome = function(){
    return !!(navigator.userAgent.match(/Chrome/));
}

window.patchFnBind = function(){
    if (Function.prototype.bind === undefined){
       Function.prototype.bind = function (bind) {
            var self = this;
            return function () {
                var args = Array.prototype.slice.call(arguments);
                return self.apply(bind || null, args);
            };
        };
    }
}

function hasSessionCookie(){
	var cookieArray = document.cookie.split(';');
	var cookies = {};
	for (var i = 0; i < cookieArray.length; i++){
		var parts = cookieArray[i].split('=');
		var key = parts[0].trim();
		var value = parts[1];
		cookies[key] = value;
	}
	//user will be an id if they're logged in
	return cookies['user'] !== 'none';
}

function sendControl(player, accel, socket) {
	var xyz = accel.getLast();
	var Dy = Math.round(-Math.pow(xyz.y, 3));
	if (Dy !== 0) {
		socket.emit("controller", {"player": player, "dy": Dy});
	}
	setTimeout(function() {
		sendControl(player, accel, socket);
	}, 100);
}

function start(socket, player) {
	if (player === 0) {
		$("#loggedIn").html("Sorry, game full");
	} else {
		$("#loggedIn").html("Ready to play, Player "+player);
		$("#login").css("display", "none");
		var accel = new Accelerometer();
		accel.startListening();
		setTimeout(function() {
			sendControl(player, accel, socket);
		}, 100);
	}
	socket.on("gameEnd", function(data) {
		$("#restart").css("display", "inline");
	});
	socket.on("gameStart", function() {
		$("#restart").css("display", "none");
	});
	socket.removeAllListeners("controlConnected");
	window.restart = function() {
		socket.emit("connectControl");
	}
}

function restart() {
}

$(document).ready(function() {
	window.patchFnBind();
	var socket = io.connect('http://localhost:3000/');
	if (hasSessionCookie()) {
		socket.on("connect", function() {
			alert("");
			socket.emit("connectControl");
			socket.on("controlConnected", function(data) {
				start(socket, data.player);
			});
		});
	}
});