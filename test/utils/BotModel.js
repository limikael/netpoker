var BotSeatModel = require("./BotSeatModel");

function BotModel() {
	this.seatModels = [];

	for (var i = 0; i < 10; i++)
		this.seatModels.push(new BotSeatModel(i));

	this.buttons = null;

	this.communityCards = [];
}

BotModel.prototype.getSeatModelBySeatIndex = function(i) {
	return this.seatModels[i];
}

BotModel.prototype.setButtons = function(buttons) {
	if (buttons instanceof Array && !buttons.length)
		buttons = [];

	this.buttons = buttons;
}

BotModel.prototype.getButtons = function() {
	return this.buttons;
}

BotModel.prototype.getCommunityCards = function() {
	return this.communityCards;
}

BotModel.prototype.getTotalSeatChips = function() {
	var total=0;

	for (var i = 0; i < 10; i++) {
		var c=this.seatModels[i].getChips();
		var v=parseInt(c);

		if (!isNaN(v))
			total+=v;
	}

	return total;
}

module.exports = BotModel;