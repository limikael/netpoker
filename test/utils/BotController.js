var SeatInfoMessage = require("../../src/js/proto/messages/SeatInfoMessage");
var ButtonsMessage = require("../../src/js/proto/messages/ButtonsMessage");
var PocketCardsMessage = require("../../src/js/proto/messages/PocketCardsMessage");

function BotController(model) {
	this.model = model;
}

BotController.prototype.setProtoConnection = function(protoConnection) {
	this.protoConnection = protoConnection;
	this.protoConnection.addMessageHandler(SeatInfoMessage, this.onSeatInfoMessage, this);
	this.protoConnection.addMessageHandler(PocketCardsMessage, this.onPocketCardsMessage, this);
	//	this.protoConnection.addMessageHandler(ButtonsMessage, this.onButtonsMessage, this);
}

BotController.prototype.onSeatInfoMessage = function(m) {
	var seatModel = this.model.getSeatModelBySeatIndex(m.getSeatIndex());

	seatModel.setName(m.getName());
	seatModel.setChips(m.getChips());
}

/*BotController.prototype.onButtonsMessage = function(m) {
}*/

BotController.prototype.onPocketCardsMessage = function(m) {
	//console.log("************* pocket cards message: " + m.getSeatIndex());

	var seatModel = this.model.getSeatModelBySeatIndex(m.getSeatIndex());
	var seatCards = seatModel.getCards();

	//console.log(seatCards);

	for (var i = 0; i < m.getCards().length; i++) {
		var cardData = m.getCards()[i];
		var cardIndex = m.getFirstIndex() + i;

		//console.log("index: " + i + " cd: " + cardData + " firstindex: " + m.getFirstIndex());
		//console.log("* cardIndex: " + cardIndex + " seat: " + seatModel.getName());

		seatCards[cardIndex] = cardData;
	}

	console.log(seatCards);
}

module.exports = BotController;