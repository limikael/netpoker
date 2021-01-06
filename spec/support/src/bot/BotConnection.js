const BotModel = require("./BotModel");
const BotController = require("./BotController");
const EventEmitter=require("events");
const MessageConnection=require("../../../../src.js/utils/MessageConnection");

class BotConnection extends EventEmitter {
	constructor() {
		super();

		this.replies = {};
		this.onceReplies = {};
		this.messages = [];
		this.model = new BotModel();
		this.controller = new BotController(this.model);
		this.runningStrategy = null;
		this.waitingForMessage=null;
		this.waitingForMessageResolve=null;
	}

	async connect(url) {
		this.connection=await MessageConnection.connect(url);
		this.controller.setConnection(this.connection);
		console.log("connected to server");
		this.connection.on("message",this.onConnectionMessage);
	}

	onConnectionMessage=(m)=>{
		this.messages.push(m);

		if (m.type==this.waitingForMessage) {
			let resolve=this.waitingForMessageResolve;

			this.waitingForMessage=null;
			this.waitingForMessageResolve=null;

			resolve(m);
		}
	}

	waitForMessage(message) {
		if (this.waitingForMessage)
			throw new Error("already waiting");

		return new Promise((resolve,reject)=>{
			this.waitingForMessage=message;
			this.waitingForMessageResolve=resolve;
		});
	}

	async runStrategy(strategy) {
		strategy.setBotConnection(this);
		await strategy.run();
	}

	getLastMessageOfType(messageType) {
		let messages=this.getMessagesOfType(messageType);
		if (messages.length>0)
			return messages[messages.length-1];
	}

	getMessagesOfType(messageType) {
		var retMessages = [];

		for (var i = 0; i < this.messages.length; i++) {
			if (this.messages[i].type == type)
				retMessages.push(this.messages[i]);
		}

		return retMessages;
	}

	send(message, params) {
		if (message=="buttonClick")
			this.model.setButtons(null);

		this.connection.send(message,params);
	}

	getSeatAt = function(seatIndex) {
		return this.model.getSeatModelBySeatIndex(seatIndex);
	}
}

/*BotConnection.prototype.clearMessages = function() {
	this.messages = [];
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
		throw new Error("Action not available: " + buttonId + " available: "+this.model.getButtons());

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
*/

module.exports = BotConnection;