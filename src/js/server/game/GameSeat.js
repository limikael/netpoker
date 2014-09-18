var BetMessage = require("../../proto/messages/BetMessage");

/**
 * A seat at a game.
 * @class GameSeat
 */
function GameSeat(game, seatIndex) {
	this.game = game;
	this.tableSeat = game.getTable().getTableSeatBySeatIndex(seatIndex);
	if (!this.tableSeat)
		throw new Error("Didn't find table seat for index: " + seatIndex);

	this.pocketCards = [];
	this.folded = false;
	this.bet = 0;
	this.potContrib = 0;
}

/**
 * Get seat index.
 * @method getSeatIndex
 */
GameSeat.prototype.getSeatIndex = function() {
	return this.tableSeat.getSeatIndex();
}

/**
 * Get table seat.
 * @method getTableSeat
 */
GameSeat.prototype.getTableSeat = function() {
	return this.tableSeat;
}

/**
 * Send a message to the game seat.
 * @method send
 */
GameSeat.prototype.send = function(m) {
	this.tableSeat.send(m);
}

/**
 * Get game reference.
 * @method getGame
 */
GameSeat.prototype.getGame = function() {
	return this.game;
}

/**
 * Add pocket card.
 * @method addPocketCard
 */
GameSeat.prototype.addPocketCard = function(cardData) {
	this.pocketCards.push(cardData);
}

/**
 * Get pocket cards.
 * @method getPocketCards
 */
GameSeat.prototype.getPocketCards = function() {
	return this.pocketCards;
}

/**
 * Make bet
 * @method makeBet
 */
GameSeat.prototype.makeBet = function(value) {
	if (value == 0)
		return;

	//console.log("********** making bet");

	this.bet += value;
	this.tableSeat.addChips(-value);

	this.game.send(this.tableSeat.getSeatInfoMessage());
	this.game.send(new BetMessage(this.tableSeat.getSeatIndex(), this.bet));
}

/**
 * Folded?
 * @method isFolded
 */
GameSeat.prototype.isFolded = function() {
	return this.folded;
}

/**
 * Get chips.
 * @method getChips
 */
GameSeat.prototype.getChips = function() {
	return this.tableSeat.getChips();
}

/**
 * Get bet.
 * @method getBet
 */
GameSeat.prototype.getBet = function() {
	return this.bet;
}

/**
 * Bet to pot.
 * @method betToPot
 */
GameSeat.prototype.betToPot = function() {
	this.potContrib += this.bet;
	this.bet = 0;
}

/**
 * Get pot contrib.
 * @method getPotContrib
 */
GameSeat.prototype.getPotContrib = function() {
	return this.potContrib;
}

module.exports = GameSeat;