/**
 * A seat at a game.
 * @class GameSeat
 */
function GameSeat(game, tableSeat) {
	this.game = game;
	this.tableSeat = tableSeat;
}

/**
 * Get seat index.
 */
GameSeat.prototype.getSeatIndex = function() {
	return this.tableSeat.getSeatIndex();
}

module.exports = GameSeat;