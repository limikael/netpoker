const BotModel = require("./BotModel");
const BotController = require("./BotController");
const EventEmitter=require("events");
const MessageConnection=require("../../../../src.js/utils/MessageConnection");
const WebSocket=require("ws");

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
		let webSocket=new WebSocket(url);
		this.connection=new MessageConnection(webSocket);
		this.controller.setConnection(this.connection);
		this.connection.on("message",this.onConnectionMessage);

		await this.connection.waitForConnection();
		console.log("connected to server");
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

	async waitForButtons() {
		if (this.model.getButtons().length>0)
			return;

		await this.waitForMessage("buttons");
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

	getLastMessage() {
		return this.messages[this.messages.length-1];
	}

	getLastMessageOfType(messageType) {
		let messages=this.getMessagesOfType(messageType);
		if (messages.length>0)
			return messages[messages.length-1];
	}

	getMessagesOfType(messageType) {
		var retMessages = [];

		for (var i = 0; i < this.messages.length; i++) {
			if (this.messages[i].type == messageType)
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

	getDealerButtonPosition = function() {
		return this.model.getDealerButtonPosition();
	}

	getButtons = function() {
		return this.model.getButtons();
	}

	act(button, value) {
		if (typeof button != "string")
			throw new Error("expected string");

		if (!this.model.getButtons()) {
			console.log("**************************** no buttons!!");
			throw new Error("can't act, no buttons");
		}

		if (!this.isActionAvailable(button))
			throw new Error("Action not available: " + button + " available: "+this.model.getButtons());

		this.send("buttonClick",{
			button: button,
			value: value
		});
	}

	isActionAvailable = function(action) {
		if (typeof action != "string")
			throw new Error("expected string");

		for (var i = 0; i < this.model.getButtons().length; i++)
			if (this.model.getButtons()[i] == action)
				return true;

		return false;
	}

	close() {
		this.connection.close();
		this.connection = null;
	}
}

/*BotConnection.prototype.clearMessages = function() {
	this.messages = [];
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

BotConnection.prototype.getCommunityCards = function() {
	return this.model.getCommunityCards();
}

BotConnection.prototype.getTotalSeatChips = function() {
	return this.model.getTotalSeatChips();
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