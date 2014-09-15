var SeatInfoMessage = require("../../src/js/proto/messages/SeatInfoMessage");
var ButtonsMessage = require("../../src/js/proto/messages/ButtonsMessage");

function BotController(model) {
	this.model = model;
}

BotController.prototype.setProtoConnection = function(protoConnection) {
	this.protoConnection = protoConnection;
	this.protoConnection.addMessageHandler(SeatInfoMessage, this.onSeatInfoMessage, this);
//	this.protoConnection.addMessageHandler(ButtonsMessage, this.onButtonsMessage, this);
}

BotController.prototype.onSeatInfoMessage = function(m) {
	var seatModel = this.model.getSeatModelBySeatIndex(m.getSeatIndex());

	seatModel.setName(m.getName());
	seatModel.setChips(m.getChips());
}

/*BotController.prototype.onButtonsMessage = function(m) {
}*/

module.exports = BotController;