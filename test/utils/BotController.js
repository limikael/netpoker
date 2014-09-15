var SeatInfoMessage = require("../../src/js/proto/messages/SeatInfoMessage");

function BotController(model) {
	this.model = model;
}

BotController.prototype.setProtoConnection = function(protoConnection) {
	this.protoConnection = protoConnection;
	this.protoConnection.addMessageHandler(SeatInfoMessage, this.onSeatInfoMessage, this);
}

BotController.prototype.onSeatInfoMessage = function(m) {
	var seatModel = this.model.getSeatModelBySeatIndex(m.getSeatIndex());

	seatModel.setName(m.getName());
	seatModel.setChips(m.getChips());
}

module.exports = BotController;