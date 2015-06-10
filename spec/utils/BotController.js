var SeatInfoMessage = require("../../src/proto/messages/SeatInfoMessage");
var ButtonsMessage = require("../../src/proto/messages/ButtonsMessage");
var PocketCardsMessage = require("../../src/proto/messages/PocketCardsMessage");
var BetMessage = require("../../src/proto/messages/BetMessage");
var CommunityCardsMessage = require("../../src/proto/messages/CommunityCardsMessage");
var FoldCardsMessage = require("../../src/proto/messages/FoldCardsMessage");
var DealerButtonMessage = require("../../src/proto/messages/DealerButtonMessage");
var PotMessage = require("../../src/proto/messages/PotMessage");
var BetsToPotMessage = require("../../src/proto/messages/BetsToPotMessage");
var HandInfoMessage = require("../../src/proto/messages/HandInfoMessage")
var CheckboxMessage = require("../../src/proto/messages/CheckboxMessage")

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
	this.protoConnection.addMessageHandler(FoldCardsMessage, this.onFoldCardsMessage, this);
	this.protoConnection.addMessageHandler(DealerButtonMessage, this.onDealerButtonMessage, this);
	this.protoConnection.addMessageHandler(PotMessage, this.onPotMessage, this);
	this.protoConnection.addMessageHandler(BetsToPotMessage, this.onBetsToPotMessage, this);
	this.protoConnection.addMessageHandler(HandInfoMessage, this.onHandInfoMessage, this);
	this.protoConnection.addMessageHandler(CheckboxMessage, this.onCheckboxMessage, this);
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

BotController.prototype.onFoldCardsMessage = function(m) {
	var seatModel = this.model.getSeatModelBySeatIndex(m.getSeatIndex());

	seatModel.clearCards();
}

BotController.prototype.onDealerButtonMessage = function(m) {
	this.model.setDealerButtonPosition(m.getSeatIndex());
}

BotController.prototype.onPotMessage = function(m) {
	this.model.setPots(m.getValues());
}

BotController.prototype.onBetsToPotMessage = function() {
	for (i = 0; i < this.model.seatModels.length; i++) {
		var seatModel = this.model.seatModels[i];
		seatModel.setBet(0);
	}
}

BotController.prototype.onHandInfoMessage = function(m) {
	this.model.setHandInfo(m.getText());
}

BotController.prototype.onCheckboxMessage = function(m) {
	this.model.setSetting(m.getId(), m.getChecked());
}

module.exports = BotController;