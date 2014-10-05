var BetMessage = require("../../proto/messages/BetMessage");
var FoldCardsMessage = require("../../proto/messages/FoldCardsMessage");
var ActionMessage = require("../../proto/messages/ActionMessage");
var PocketCardsMessage = require("../../proto/messages/PocketCardsMessage");
var Hand = require("../hand/Hand");

/**
 * A seat at a game.
 * @class GameSeat
 * @module server
 */
function GameSeat(game, seatIndex) {
	this.game = game;
	this.tableSeat = game.getTable().getTableSeatBySeatIndex(seatIndex);
	if (!this.tableSeat)
		throw new Error("Didn't find table seat for index: " + seatIndex);

	this.pocketCards = [];
	this.bet = 0;
	this.potContrib = 0;

	this.folded = false;
	this.showing = false;
	this.mucked = false;
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

/**
 * Fold cards.
 * @method fold
 */
GameSeat.prototype.fold = function() {
	this.folded = true;

	this.game.send(new ActionMessage(this.getSeatIndex(), ActionMessage.FOLD));
	this.game.send(new FoldCardsMessage(this.getSeatIndex()));
}

/**
 * Show cards.
 * @method show
 */
GameSeat.prototype.show = function() {
	this.showing = true;

	var p = new PocketCardsMessage(this.getSeatIndex());
	for (var i = 0; i < this.pocketCards.length; i++)
		p.addCard(this.pocketCards[i]);

	this.game.send(p);

	if (this.game.getCommunityCards().length == 5)
		this.game.getTable().chat(null,
			this.tableSeat.getUser().getName() + " shows " +
			this.getHand().getScoreString());
}

/**
 * Muck cards.
 * @method muck
 */
GameSeat.prototype.muck = function() {
	this.mucked = true;
	this.game.send(new ActionMessage(this.getSeatIndex(), ActionMessage.MUCK));
	this.game.send(new FoldCardsMessage(this.getSeatIndex()));
}

/**
 * Get hand.
 * @method getHand
 */
GameSeat.prototype.getHand = function() {
	return new Hand(this.game.getCommunityCards().concat(this.pocketCards));
}

/**
 * Is this player showing the cards?
 * @method isShowing
 */
GameSeat.prototype.isShowing = function() {
	return this.showing;
}

/**
 * Does the game seat still have cards?
 * I.e. not folded or mucked.
 * @method hasCards
 */
GameSeat.prototype.hasCards = function() {
	if (this.folded || this.mucked)
		return false;

	return true;
}

/**
 * Get the connection that is currently controlling this
 * GameSeat.
 * @method getProtoConnection
 */
GameSeat.prototype.getProtoConnection = function() {
	return this.tableSeat.getProtoConnection();
}

module.exports = GameSeat;