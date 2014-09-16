var GameState = require("./GameState");
var FunctionUtil = require("../../utils/FunctionUtil");
var PocketCardsMessage = require("../../proto/messages/PocketCardsMessage");
var CardData = require("../../proto/data/CardData");

/**
 * Manage a round of beting.
 * @class RoundState
 */
function RoundState() {
	GameState.call(this);
}

FunctionUtil.extend(RoundState, GameState);

/**
 * Run the state.
 * @method run
 */
RoundState.prototype.run = function() {
	if (!this.hasDealtPocketCards())
		this.dealPocketCards();
}

/**
 * Deal pocket cards.
 * @method dealPocketCards
 */
RoundState.prototype.dealPocketCards = function() {
	console.log("dealing pocket cards......");

	for (var i = 0; i < 2; i++) {
		for (var g = 0; g < this.game.getGameSeats().length; g++) {
			var card = this.game.getNextCard();

			var gameSeat = this.game.getGameSeats()[g];
			gameSeat.addPocketCard(card);

			// Send hidden
			var m = new PocketCardsMessage(gameSeat.getSeatIndex());
			m.setAnimate(true);
			m.setFirstIndex(i);
			m.addCard(new CardData(CardData.HIDDEN));
			this.game.sendExceptSeat(m, gameSeat);

			// Send shown.
			m = new PocketCardsMessage(gameSeat.getSeatIndex());
			m.setAnimate(true);
			m.setFirstIndex(i);
			m.addCard(card);
			gameSeat.send(m, gameSeat);
		}
	}
}

/**
 * Have we dealt pocket cards?
 */
RoundState.prototype.hasDealtPocketCards = function() {
	dealt = false;

	for (var i = 0; i < this.game.getGameSeats().length; i++) {
		var gameSeat = this.game.getGameSeats()[i];

		if (gameSeat.getPocketCards().length)
			dealt = true;
	}

	return dealt;
}

module.exports = RoundState;