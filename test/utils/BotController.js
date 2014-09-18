var SeatInfoMessage = require("../../src/js/proto/messages/SeatInfoMessage");
var ButtonsMessage = require("../../src/js/proto/messages/ButtonsMessage");
var PocketCardsMessage = require("../../src/js/proto/messages/PocketCardsMessage");
var BetMessage = require("../../src/js/proto/messages/BetMessage");
var CommunityCardsMessage = require("../../src/js/proto/messages/CommunityCardsMessage");

function BotController(model) {
	this.model = model;
}

BotController.prototype.setProtoConnection = function(protoConnection) {
	this.protoConnection = protoConnection;
	this.protoConnection.addMessageHandler(SeatInfoMessage, this.onSeatInfoMessage, this);
	this.protoConnection.addMessageHandler(PocketCardsMessage, this.onPocketCardsMessage, this);
	this.protoConnection.addMessageHandler(ButtonsMessage, this.onButtonsMessage, this);
	this.protoConnection.addMessageHandler(BetMessage, this.onBetMessage, this);
	this.protoConnection.addMessageHandler(CommunityCardsMessage, this.onCommunityCardsMessage, this);
}

BotController.prototype.onSeatInfoMessage = function(m) {
	var seatModel = this.model.getSeatModelBySeatIndex(m.getSeatIndex());

	seatModel.setName(m.getName());
	seatModel.setChips(m.getChips());
}

BotController.prototype.onButtonsMessage = function(m) {
	this.model.setButtons(m.getButtons());
}

BotController.prototype.onPocketCardsMessage = function(m) {
	var seatModel = this.model.getSeatModelBySeatIndex(m.getSeatIndex());
	var seatCards = seatModel.getCards();

	for (var i = 0; i < m.getCards().length; i++) {
		var cardData = m.getCards()[i];
		var cardIndex = m.getFirstIndex() + i;

		seatCards[cardIndex] = cardData;
	}
}

BotController.prototype.onBetMessage = function(m) {
	var seatModel = this.model.getSeatModelBySeatIndex(m.getSeatIndex());

	seatModel.setBet(m.getValue());
}

BotController.prototype.onCommunityCardsMessage = function(m) {
	for (var i = 0; i < m.getCards().length; i++) {
		var c = m.getCards()[i];

		this.model.getCommunityCards()[m.getFirstIndex() + i] = c;
	}
}

module.exports = BotController;