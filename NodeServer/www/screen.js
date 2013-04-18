function ready() {
	var socket = io.connect('http://localhost:3000/');
	var app = new App();
	var draw = new Draw(app);
	var run = new Run(app, draw, socket);
}

function deepcopy(obj) {
	var objCopy = {};
	for (prop in obj) {
		if (typeof(obj[prop])==="object") {
			objCopy[prop] = deepcopy(obj[prop]);
		} else {
			objCopy[prop] = obj[prop];
		}
	}
	return objCopy;
}

/************************************************************
*        App object stores variables related to game        *
************************************************************/
function App() {
	this._loadBoard();
	this._loadObjects();
}

App.prototype._loadBoard = function() {
	this._width = 600;
	this._height = 400;
	this._bgcolor = "#000000";
	this._txtColor = "#ffffff";
	this._txtAlign = "center";
	this._titleText = "Pong!";
	this._titleTextFont = "30px Arial"
	this._titleTextX = this._width/2;
	this._titleTextY = 50;
	this._scoreText = "Score:"
	this._scoreTextFont = "20px Arial"
	this._scoreTextX = this._width/2 - 30;
	this._scoreTextY = 75;
	this.__score = {
		1: 0,
		2: 0
	};
	this.score = deepcopy(this.__score);
};

App.prototype._loadObjects = function() {
	this.__ballLocation = {
		"x": this._width/2,
		"y": this._height/2
	};
	this.__playerLocation = {
		1: this._height/2,
		2: this._height/2
	};
	this.ballLocation = deepcopy(this.__ballLocation);
	this.playerLocation = deepcopy(this.__playerLocation);
};

App.prototype.getBoard = function() {
	var vars = {
		"res": "getBoard",
		"width": this._width,
		"height": this._height,
		"color": this._bgcolor,
		"textColor": this._txtColor,
		"textAlign": this._txtAlign,
		"title": {
			"text": this._titleText,
			"font": this._titleTextFont,
			"x": this._titleTextX,
			"y": this._titleTextY,
		},
		"scoreDisplay": {
			"text": this._scoreText,
			"font": this._scoreTextFont,
			"x": this._scoreTextX,
			"y": this._scoreTextY,
		},
	};
	return vars;
};

App.prototype.getBall = function() {
	var vars = {
		"res": "getBall",
		"location": this.ballLocation,
		"radius": 10,
		"color": "#ffffff"
	}
	return vars;
};

App.prototype.getPlayers = function() {
	var vars = {
		"res": "getPlayers",
		"location": this.playerLocation,
		"height": 50,
		"width": 5,
		"color": "#ffffff"
	}
	return vars;
};

App.prototype.getScore = function() {
	var vars = {
		"res": "getScore",
		"score": this.score,
		"x": this._scoreTextX+80,
		"y": this._scoreTextY,
		"font": this._scoreTextFont,
		"textColor": this._txtColor,
		"textAlign": this._txtAlign
	}
	return vars;
};

App.prototype.moveBall = function(dx, dy) {
	this.ballLocation.x += dx;
	this.ballLocation.y += dy;
};

App.prototype.movePlayer = function(player, motion) {
	var players = this.getPlayers();
	if (this.playerLocation[player]+motion<
		players.height/2) {
		this.playerLocation[player] = players.height/2;
	} else if (this.playerLocation[player]+motion>
		this._height-players.height/2) {
		this.playerLocation[player] = this._height-players.height/2;
	} else {
		this.playerLocation[player] += motion;
	}
};

App.prototype.playerScore = function(player) {
	this.score[player]++;
	this.ballLocation = deepcopy(this.__ballLocation);
	this.lastWin = player;
};

App.prototype.getLastWinner = function() {
	return this.lastWin;
};

App.prototype.restart = function() {
	this.ballLocation = deepcopy(this.__ballLocation);
	this.playerLocation = deepcopy(this.__playerLocation);
	this.score = deepcopy(this.__score);
};
/***********************************************************/

/************************************************************
*   Draw object creates canvas and draws everything on it   *
************************************************************/
function Draw(app) {
	this.app = app;
	this._initCanvas();
	this.winner = null;
	this.interval = setInterval(this.redrawAll.bind(this), 5);
}

Draw.prototype._initCanvas = function() {
	var vars = this.app.getBoard();
	this.canvas = document.getElementById("pongboard");
	this.ctx = this.canvas.getContext("2d");
	this.canvas.width = vars.width;
	this.canvas.height = vars.height;
};

Draw.prototype._drawCanvas = function() {
	var vars = this.app.getBoard();
	this.ctx.fillStyle = vars.color;
	this.ctx.fillRect(0, 0, vars.width, vars.height);
	this.ctx.fillStyle = vars.textColor;
	this.ctx.textAlign = vars.textAlign;
	this.ctx.font = vars.title.font;
	this.ctx.fillText(vars.title.text, vars.title.x, 
					  vars.title.y);
	this.ctx.font = vars.scoreDisplay.font;
	this.ctx.fillText(vars.scoreDisplay.text, 
					  vars.scoreDisplay.x, 
					  vars.scoreDisplay.y);
};

Draw.prototype._drawBall = function() {
	var vars = this.app.getBall();
	this.ctx.fillStyle = vars.color;
	this.ctx.beginPath();
	this.ctx.arc(vars.location.x, vars.location.y, 
				 vars.radius, 0, 2*Math.PI, true);
	this.ctx.fill();
};

Draw.prototype._drawPlayers = function() {
	var vars = this.app.getPlayers();
	this.ctx.fillStyle = vars.color;
	this.ctx.fillRect(2, vars.location[1]-vars.height/2, 
					  vars.width, vars.height);
	this.ctx.fillRect(-2+this.canvas.width-vars.width, 
					  vars.location[2]-vars.height/2, 
					  vars.width, vars.height);
};

Draw.prototype._drawScore = function() {
	var vars = this.app.getScore();
	this.ctx.fillStyle = vars.textColor;
	this.ctx.textAlign = vars.textAlign;
	this.ctx.font = vars.font;
	this.ctx.fillText(vars.score[1]+" - "+vars.score[2], 
					  vars.x, vars.y);
};

Draw.prototype.drawWin = function(winner) {
	this.winner = winner;
	var vars = this.app.getBoard();
	var text;
	if (winner === 0) {
		text = "Tie Game!"
	} else {
		text = "Player "+winner+" wins!"
	}
	this.ctx.fillStyle = vars.textColor;
	this.ctx.textAlign = vars.textAlign;
	this.ctx.font = vars.title.font;
	this.ctx.fillText(text, vars.title.x, 
					  vars.title.y + 100);
}

Draw.prototype.redrawAll = function() {
	this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
	this._drawCanvas();
	this._drawBall();
	this._drawPlayers();
	this._drawScore();
	if (this.winner!==null) {
		this.drawWin(this.winner);
	}
};
/***********************************************************/

/************************************************************
*     Run creates event handlers and makes things move      *
************************************************************/
function Run(app, draw, socket) {
	this.app = app;
	this.socket = socket;
	this.draw = draw;
	this._init();
	this.controlPlayer();
	socket.on( "gameStart", function() {
			this.app.restart();
			this.draw.winner = null;
			this.draw.redrawAll();
			this.interval = setInterval(this._ballMotion.bind(this), 5);
	}.bind(this));
	socket.on("gameEnd", function(data) {
		if (data.disconnect) {
			this.gameEnd(false);
		}
	}.bind(this))
}

Run.prototype._init = function() {
	this.velx = (this.app.getLastWinner()==2) ? 1: -1;
	this.vely = 1;
};

Run.prototype._walls = function() {
	var board = this.app.getBoard();
	var ball = this.app.getBall();
	var score = this.app.getScore();
	if (ball.location.x <= ball.radius) {
		this.app.playerScore(2);
		this._init();
		if (score.score[2] === 10) {
			this.gameEnd(true);
		}
	}
	if (ball.location.x >= board.width-ball.radius) {
		this.app.playerScore(1);
		this._init();
		if (score.score[1] === 10) {
			this.gameEnd(true);
		}
	}
	if (ball.location.y <= ball.radius || 
		ball.location.y >= board.height-ball.radius) {
		this.vely = -this.vely;
	}
};

Run.prototype._players = function() {
	var board = this.app.getBoard();
	var players = this.app.getPlayers();
	var ball = this.app.getBall();
	if (ball.location.y>=players.location[1]-players.height/2 && 
		ball.location.y<=players.location[1]+players.height/2 &&
		ball.location.x<=2+players.width+ball.radius) {
		this.velx = 1;
	}
	if (ball.location.y>=players.location[2]-players.height/2 && 
		ball.location.y<=players.location[2]+players.height/2 &&
		ball.location.x>=
		board.width-2-players.width-ball.radius) {
		this.velx = -1;
	}
};

Run.prototype._ballMotion = function() {
	this._walls();
	this._players();
	this.app.moveBall(this.velx, this.vely);
	this.draw.redrawAll();
};

Run.prototype.gameEnd = function (callGameWon) {
	if (callGameWon) {
		this.socket.emit("gameWon");
	}
	clearInterval(this.interval);
	var winner;
	var score = this.app.getScore();
	if (score.score[1] > score.score[2]) {
		winner = 1;
	} else if (score.score[1] < score.score[2]) {
		winner = 2;
	} else {
		winner = 0;
	}
	this.draw.drawWin(winner);
}

Run.prototype.controlPlayer = function() {
	this.socket.on('paddlemove', function(data) {
		this.app.movePlayer(data.player, data.dy);
		this.draw.redrawAll();
	}.bind(this));
};
/***********************************************************/

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

window.patchFnBind();