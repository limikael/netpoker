function BotSeatModel(seatIndex) {
	this.seatIndex = seatIndex;
	this.name = "";
	this.chips = "";
	this.cards = [null, null];
	this.bet = 0;
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

BotSeatModel.prototype.getCards = function() {
	return this.cards;
}

BotSeatModel.prototype.getCardAt = function(i) {
	return this.cards[i];
}

BotSeatModel.prototype.getBet = function() {
	return this.bet;
}

BotSeatModel.prototype.setBet = function(bet) {
	this.bet = bet;
}

module.exports = BotSeatModel;