/**
 * A seat at a game.
 * @class GameSeat
 */
function GameSeat(game, seatIndex) {
	this.game = game;
	this.tableSeat = game.getTable().getTableSeatBySeatIndex(seatIndex);
	if (!this.tableSeat)
		throw new Error("Didn't find table seat for index: " + seatIndex);
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

module.exports = GameSeat;