var BotSeatModel = require("./BotSeatModel");

function BotModel() {
	this.seatModels = [];

	for (var i = 0; i < 10; i++)
		this.seatModels.push(new BotSeatModel(i));
}

BotModel.prototype.getSeatModelBySeatIndex = function(i) {
	return this.seatModels[i];
}

module.exports = BotModel;