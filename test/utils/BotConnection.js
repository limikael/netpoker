var InitMessage = require("../../src/js/proto/messages/InitMessage");
var MessageClientConnection = require("../../src/js/utils/MessageClientConnection");
var ProtoConnection = require("../../src/js/proto/ProtoConnection");
var Thenable = require("../../src/js/utils/Thenable");
var PipeNetPokerServer = require("./PipeNetPokerServer")

function BotConnection(connectionTarget, token) {
	this.connectionTarget = connectionTarget;
	this.token = token;
	this.replies = {};
	this.messages = [];
}

BotConnection.prototype.connectToTable = function(tableId) {
	this.initMessage = new InitMessage(this.token);
	this.initMessage.setTableId(tableId);

	if (this.connectionTarget instanceof PipeNetPokerServer) {
		this.connection = this.connectionTarget.createMessagePipeConnection();
		this.protoConnection = new ProtoConnection(this.connection);
		this.protoConnection.on(ProtoConnection.MESSAGE, this.onProtoConnectionMessage, this);
		this.onConnectionConnect();
	} else {
		this.connection = new MessageClientConnection();
		this.protoConnection = new ProtoConnection(this.connection);
		this.protoConnection.on(ProtoConnection.MESSAGE, this.onProtoConnectionMessage, this);
		this.connection.connect(this.connectionTarget).then(
			this.onConnectionConnect.bind(this),
			function() {
				throw "Bot connection failed";
			}
		);
	}
}

BotConnection.prototype.onConnectionConnect = function() {
	this.protoConnection.send(this.initMessage);
}

BotConnection.prototype.clearMessages = function() {
	this.messages = [];
}

BotConnection.prototype.getLastMessageOfType = function(messageClass) {
	var type = messageClass.TYPE;

	//console.log("looking for type: "+type);

	for (var i = this.messages.length - 1; i >= 0; i--) {
		//console.log(this.messages[i]);
		if (this.messages[i].type == type)
			return this.messages[i];
	}

	return null;
}

BotConnection.prototype.waitForMessage = function(messageClass) {
	if (this.waitThenable)
		throw "Already waiting for message";

	this.waitThenable = new Thenable();
	this.waitingForType = messageClass.TYPE;

	return this.waitThenable;
}

BotConnection.prototype.onProtoConnectionMessage = function(e) {
	console.log("** BOT message: " + e.message.type + " replying: " + this.replies[e.message.type]);

	this.messages.push(e.message);

	if (this.replies[e.message.type])
		this.send(this.replies[e.message.type]);

	if (this.waitingForType && e.message.type == this.waitingForType) {
		var thenable = this.waitThenable;

		this.waitingForType = null;
		this.waitThenable = null;

		thenable.notifySuccess(e.message);
	}
}

BotConnection.prototype.send = function(message) {
	this.protoConnection.send(message);
}

BotConnection.prototype.close = function() {
	this.connection.close();
	this.connection = null;
	this.protoConnection = null;
}

BotConnection.prototype.reply = function(messageClass, message) {
	this.replies[messageClass.TYPE] = message;
}

module.exports = BotConnection;