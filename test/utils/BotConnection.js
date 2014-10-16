var InitMessage = require("../../src/proto/messages/InitMessage");
var MessageClientConnection = require("../../src/utils/MessageClientConnection");
var ProtoConnection = require("../../src/proto/ProtoConnection");
var Thenable = require("../../src/utils/Thenable");
var PipeNetPokerServer = require("./PipeNetPokerServer");
var StateCompleteMessage = require("../../src/proto/messages/StateCompleteMessage");
var ShowDialogMessage = require("../../src/proto/messages/ShowDialogMessage");
var ButtonClickMessage = require("../../src/proto/messages/ButtonClickMessage");
var SeatClickMessage = require("../../src/proto/messages/SeatClickMessage");
var CheckboxMessage = require("../../src/proto/messages/CheckboxMessage");
var ButtonData = require("../../src/proto/data/ButtonData");
var BotModel = require("./BotModel");
var BotController = require("./BotController");
var EventDispatcher = require("../../src/utils/EventDispatcher");

function BotConnection(connectionTarget, token) {
	this.connectionTarget = connectionTarget;
	this.token = token;
	this.replies = {};
	this.onceReplies = {};
	this.messages = [];
	this.connectThenable;
	this.model = new BotModel();
	this.controller = new BotController(this.model);

	this.runningStrategy = null;
	this.strategyCompleteThenable = null;
	this.messageDispatcher = new EventDispatcher();
}

/**
 * Add message handler.
 * @method addMessageHandler
 */
BotConnection.prototype.addMessageHandler = function(messageType, handler, scope) {
	if (messageType.hasOwnProperty("TYPE"))
		messageType = messageType.TYPE;

	this.messageDispatcher.on(messageType, handler, scope);
}

/**
 * Remove message handler.
 * @method removeMessageHandler
 */
BotConnection.prototype.removeMessageHandler = function(messageType, handler, scope) {
	if (messageType.hasOwnProperty("TYPE"))
		messageType = messageType.TYPE;

	this.messageDispatcher.off(messageType, handler, scope);
}

BotConnection.prototype.runStrategy = function(strategy) {
	if (this.runningStrategy)
		throw new Error("Already running a stragety");

	this.strategyCompleteThenable = new Thenable();

	//console.log("strategy: "+strategy);

	this.runningStrategy = strategy;
	this.runningStrategy.setBotConnection(this);
	this.runningStrategy.on("complete", this.onStrategyComplete, this);
	this.runningStrategy.run();

	return this.strategyCompleteThenable;
}

BotConnection.prototype.clearStrategy = function() {
	if (this.runningStrategy) {
		this.runningStrategy.stop();
		this.runningStrategy.off("complete", this.onStrategyComplete, this);
		this.runningStrategy = null;
	}
	this.strategyCompleteThenable = null;
}

BotConnection.prototype.onStrategyComplete = function() {
	var thenable = this.strategyCompleteThenable;

	this.runningStrategy.off("complete", this.onStrategyComplete, this);
	this.runningStrategy = null;
	this.strategyCompleteThenable = null;

	thenable.resolve();
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

BotConnection.prototype.getMessagesOfType = function(messageClass) {
	var type = messageClass.TYPE;
	var retMessages = [];

	for (var i = 0; i < this.messages.length; i++) {
		if (this.messages[i].type == type)
			retMessages.push(this.messages[i]);
	}

	return retMessages;
}

BotConnection.prototype.waitForMessage = function(messageClass) {
	if (this.waitThenable)
		throw "Already waiting for message";

	this.waitThenable = new Thenable();
	this.waitingForType = messageClass.TYPE;

	return this.waitThenable;
}

BotConnection.prototype.onProtoConnectionMessage = function(e) {
	//console.log("** BOT message: " + e.message.type + " replying: " + this.replies[e.message.type]);

	this.messages.push(e.message);

	this.messageDispatcher.trigger(e.message);

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

BotConnection.prototype.act = function(buttonId, value) {
	if (buttonId instanceof ButtonData) {
		value = buttonId.getValue();
		buttonId = buttonId.getButton();
	}

	if (!this.model.getButtons()) {
		console.log("**************************** no buttons!!");
		throw new Error("can't act, no buttons");
	}

	if (!this.isActionAvailable(buttonId))
		throw new Error("Action not available: " + buttonId);

	this.send(new ButtonClickMessage(buttonId, value));
}

BotConnection.prototype.getCommunityCards = function() {
	return this.model.getCommunityCards();
}

BotConnection.prototype.getTotalSeatChips = function() {
	return this.model.getTotalSeatChips();
}

BotConnection.prototype.getDealerButtonPosition = function() {
	return this.model.getDealerButtonPosition();
}

BotConnection.prototype.isActionAvailable = function(action) {
	if (action instanceof ButtonData)
		action = action.getButton();

	if (!action)
		throw new Error("what action is that?");

	if (!this.model.getButtons())
		return false;

	for (var i = 0; i < this.model.getButtons().length; i++)
		if (this.model.getButtons()[i].getButton() == action)
			return true;

	return false;
}

BotConnection.prototype.getPot = function() {
	return this.model.getPot();
}

BotConnection.prototype.getHandInfo = function() {
	return this.model.getHandInfo();
}

BotConnection.prototype.getSetting = function(setting) {
	return this.model.getSetting(setting);
}

BotConnection.prototype.setSetting = function(setting, checked) {
	this.model.setSetting(setting, checked);
	this.send(new CheckboxMessage(setting, checked));
}

module.exports = BotConnection;