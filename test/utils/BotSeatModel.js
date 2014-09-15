function BotSeatModel(seatIndex) {
	this.seatIndex = seatIndex;
	this.name = "";
	this.chips = "";
}

BotSeatModel.prototype.setName = function(value) {
	this.name = value;
}

BotSeatModel.prototype.setChips = function(value) {
	this.chips = value;
}

BotSeatModel.prototype.getName = function() {
	return this.name;
}

BotSeatModel.prototype.getChips = function() {
	return this.chips;
}

module.exports = BotSeatModel;