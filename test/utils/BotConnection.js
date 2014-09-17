var InitMessage = require("../../src/js/proto/messages/InitMessage");
var MessageClientConnection = require("../../src/js/utils/MessageClientConnection");
var ProtoConnection = require("../../src/js/proto/ProtoConnection");
var Thenable = require("../../src/js/utils/Thenable");
var PipeNetPokerServer = require("./PipeNetPokerServer");
var StateCompleteMessage = require("../../src/js/proto/messages/StateCompleteMessage");
var ShowDialogMessage = require("../../src/js/proto/messages/ShowDialogMessage");
var ButtonClickMessage = require("../../src/js/proto/messages/ButtonClickMessage");
var SeatClickMessage = require("../../src/js/proto/messages/SeatClickMessage");
var ButtonData = require("../../src/js/proto/data/ButtonData");
var BotModel = require("./BotModel");
var BotController = require("./BotController");

function BotConnection(connectionTarget, token) {
	this.connectionTarget = connectionTarget;
	this.token = token;
	this.replies = {};
	this.onceReplies = {};
	this.messages = [];
	this.connectThenable;
	this.model = new BotModel();
	this.controller = new BotController(this.model);
}

BotConnection.prototype.connectToTable = function(tableId) {
	this.initMessage = new InitMessage(this.token);
	this.initMessage.setTableId(tableId);

	this.connectThenable = new Thenable();

	if (this.connectionTarget instanceof PipeNetPokerServer) {
		this.connection = this.connectionTarget.createMessagePipeConnection();
		this.protoConnection = new ProtoConnection(this.connection);
		this.controller.setProtoConnection(this.protoConnection);
		this.protoConnection.on(ProtoConnection.MESSAGE, this.onProtoConnectionMessage, this);
		this.onConnectionConnect();
	} else {
		this.connection = new MessageClientConnection();
		this.protoConnection = new ProtoConnection(this.connection);
		this.controller.setProtoConnection(this.protoConnection);
		this.protoConnection.on(ProtoConnection.MESSAGE, this.onProtoConnectionMessage, this);
		this.connection.connect(this.connectionTarget).then(
			this.onConnectionConnect.bind(this),
			function() {
				throw "Bot connection failed";
			}
		);
	}

	return this.connectThenable;
}

BotConnection.prototype.onConnectionConnect = function() {
	this.protoConnection.send(this.initMessage);
	this.connectThenable.resolve();
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

	if (this.onceReplies[e.message.type]) {
		var reply = this.onceReplies[e.message.type];
		delete this.onceReplies[e.message.type];
		this.send(reply);
	}

	if (this.waitingForType && e.message.type == this.waitingForType) {
		var thenable = this.waitThenable;

		this.waitingForType = null;
		this.waitThenable = null;

		thenable.notifySuccess(e.message);
	}
}

BotConnection.prototype.send = function(message) {
	if (message instanceof ButtonClickMessage)
		this.model.setButtons(null);

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

BotConnection.prototype.replyOnce = function(messageClass, message) {
	this.onceReplies[messageClass.TYPE] = message;
}

BotConnection.prototype.sitIn = function(seatIndex, amount) {
	console.log("sit in with: " + amount);
	this.reply(StateCompleteMessage, new SeatClickMessage(seatIndex));
	this.reply(ShowDialogMessage, new ButtonClickMessage(ButtonData.SIT_IN, amount));
}

BotConnection.prototype.getSeatAt = function(seatIndex) {
	return this.model.getSeatModelBySeatIndex(seatIndex);
}

BotConnection.prototype.getButtons = function() {
	return this.model.getButtons();
}

BotConnection.prototype.act = function(buttonId) {
	if (!this.model.getButtons())
		throw new Error("can't act, no buttons");

	this.send(new ButtonClickMessage(buttonId));
}

BotConnection.prototype.getCommunityCards = function() {
	return this.model.getCommunityCards();
}

module.exports = BotConnection;