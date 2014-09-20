var GameState = require("./GameState");
var FinishedState = require("./FinishedState");
var FunctionUtil = require("../../utils/FunctionUtil");
var GameSeatPrompt = require("./GameSeatPrompt");
var FunctionUtil = require("../../utils/FunctionUtil");
var ButtonData = require("../../proto/data/ButtonData");
var PayOutMessage = require("../../proto/messages/PayOutMessage");
var DelayMessage = require("../../proto/messages/DelayMessage");
var PotMessage = require("../../proto/messages/PotMessage");
var Hand = require("../hand/Hand");

/**
 * Show or muck cards.
 * @class ShowMuckState
 */
function ShowMuckState() {
	GameState.call(this);

	this.gameSeatIndexToSpeak = 0;
}

FunctionUtil.extend(ShowMuckState, GameState);

/**
 * Run.
 * @method run
 */
ShowMuckState.prototype.run = function() {
	this.gameSeatIndexToSpeak = 0;
	this.ensureGameSeatIndexInGame();
	this.askOrShow();
}

/**
 * Ensure the current game seat, as indicated by `gameSeatIndexToSpeak`
 * is in the game, i.e. not folded. If `gameSeatIndexToSpeak` indicates
 * a seat that is folded, we advance it until it points to a gameSeat
 * that is still in the game. If `gameSeatIndexToSpeak` advances past
 * all participating players, it does not wrap around, but will stay
 * pointing past the last player. We can use this state as an indication
 * that we have asked all players what they want to do.
 * @method ensureGameSeatIndexInGame
 * @private
 */
ShowMuckState.prototype.ensureGameSeatIndexInGame = function() {
	while (this.gameSeatIndexToSpeak < this.game.getGameSeats().length &&
		this.game.getGameSeats()[this.gameSeatIndexToSpeak].isFolded())
		this.gameSeatIndexToSpeak++;
}

/**
 * Check if the current player, as indicated by `gameSeatIndexToSpeak`
 * must show his/her cards. If so, make the player show the cards and call
 * `askDone` to check what the next player needs to do. If the game
 * condition does not mandate that the player must show his/her cards,
 * send a prompt to the player to ask what do to.
 * @method askOrShow
 * @private
 */
ShowMuckState.prototype.askOrShow = function() {
	var gameSeat = this.game.getGameSeats()[this.gameSeatIndexToSpeak];

	if (this.mustShow(gameSeat)) {
		gameSeat.show();
		this.askDone();
	} else {
		console.log("gameseat: " + gameSeat);

		this.prompt = new GameSeatPrompt(gameSeat);
		this.prompt.addButton(ButtonData.MUCK);
		this.prompt.addButton(ButtonData.SHOW);
		this.prompt.setDefaultButton(ButtonData.MUCK);

		this.prompt.on(GameSeatPrompt.COMPLETE, this.onPromptComplete, this);

		/*	if (game.communityCards.length==5)
				prompt.usePref(CheckboxMessage.AUTO_MUCK_LOSING,ButtonData.MUCK);*/

		this.prompt.ask();
	}
}

/**
 * Show muck prompt complete.
 * @method onPromptComplete
 * @private
 */
ShowMuckState.prototype.onPromptComplete = function() {
	var prompt = this.prompt;

	this.prompt.off(GameSeatPrompt.COMPLETE, this.onPromptComplete, this);
	this.prompt = null;

	var gameSeat = this.game.getGameSeats()[this.gameSeatIndexToSpeak];

	// the place that needs work...

	if (prompt.getButton() == ButtonData.SHOW) {
		gameSeat.show();
	} else {
		console.log("******** mucikg...")
		gameSeat.muck();
	}

	this.askDone();
}

/**
 * Ask done. If there are more players to ask, ask them. If all
 * player have been asked, pay out.
 * @method askDone
 * @private
 */
ShowMuckState.prototype.askDone = function() {
	this.gameSeatIndexToSpeak++;
	this.ensureGameSeatIndexInGame();

	if (this.gameSeatIndexToSpeak >= this.game.getGameSeats().length)
		this.payOut();

	else
		this.askOrShow();
}

/**
 * Must this seat show the cards?
 * @method mustShow
 * @param {GameSeat} thisSeat 
 * @private
 */
ShowMuckState.prototype.mustShow = function(thisSeat) {
	if (!thisSeat)
		throw new Error("mustShow: thisSeat is null");

	var bestSoFar = null;

	if (this.game.getNumPlayersRemaining() < 2)
		return false;

	for (var g = 0; g < this.game.getGameSeats().length; g++) {
		var gameSeat = this.game.getGameSeats()[g];
		if (gameSeat == thisSeat) {
			if (Hand.compare(thisSeat.getHand(), bestSoFar) >= 0)
				return true;

			else
				return false;
		}

		if (!gameSeat.isFolded())
			if (gameSeat.getPotContrib() >= thisSeat.getPotContrib())
				if (Hand.compare(gameSeat.getHand(), bestSoFar) > 0)
					bestSoFar = gameSeat.getHand();
	}

	throw new Error("We should not be here!");
	return false;
}

/**
 * Pay out the money.
 * @method payOut
 * @private
 */
ShowMuckState.prototype.payOut = function() {
	var payOutMessage = new PayOutMessage();
	var winning = [];
	var limits = this.game.getUnfoldedPotContribs();
	var last = 0;
	var totalRake = 0;
	var rakePercent = this.game.getTable().getRakePercent();

	for (var l = 0; l < limits.length; l++) {
		var limit = limits[l];
		var bestSeats = this.getWinningSeatsForPotContrib(limit);
		var pot = this.game.getSplitPot(last, limit);
		var payOut = Math.round(pot / bestSeats.length);
		var rake = Math.floor(payOut * rakePercent / 100);

		totalRake += rake;
		var payOutMinusRake = payOut - rake;

		for (var g = 0; g < bestSeats.length; g++) {
			var gameSeat = bestSeats[g];
			if (winning.indexOf(gameSeat) < 0)
				winning.push(gameSeat);

			payOutMessage.setValueAt(gameSeat.getSeatIndex(), payOutMinusRake);
			gameSeat.getTableSeat().addChips(payOutMinusRake);
		}

		var s = this.createPayOutString(bestSeats, payOutMinusRake * bestSeats.length);
		this.game.getTable().chat(null, s);

		last = limit;
	}

	console.log("**** RAKE is: " + totalRake);
	this.game.setRake(totalRake);

	this.game.send(new DelayMessage(1000));
	this.game.send(new PotMessage());
	this.game.send(payOutMessage);

	for (var g = 0; g < winning.length; g++) {
		var gameSeat = winning[g];
		this.game.send(gameSeat.getTableSeat().getSeatInfoMessage());
	}

	this.game.setGameState(new FinishedState());
}

/**
 * Get winning seat for pot contrib.
 * @method getWinningSeatsForPotContrib
 * @param {Integer} contrib The pot contribution.
 * @return {GameSeat[]} The game seats.
 * @private
 */
ShowMuckState.prototype.getWinningSeatsForPotContrib = function(contrib) {
	var bestSeats = [];

	for (var g = 0; g < this.game.getGameSeats().length; g++) {
		var gameSeat = this.game.getGameSeats()[g];

		if (!gameSeat.isFolded() && gameSeat.getPotContrib() >= contrib) {
			if (!bestSeats.length) {
				bestSeats.push(gameSeat);
			} else {
				var cmp = Hand.compare(gameSeat.getHand(), bestSeats[0].getHand());

				if (cmp > 0)
					bestSeats = [gameSeat];

				else if (cmp == 0)
					bestSeats.push(gameSeat);
			}
		}
	}

	return bestSeats;
}

/**
 * Create payout string.
 * @method createPayOutString
 * @param {GameSeat[]} seats The game seats to create the payout string for.
 * @private
 */
ShowMuckState.prototype.createPayOutString = function(seats, pot) {
	var s = "";

	for (var i = 0; i < seats.length; i++) {
		var gameSeat = seats[i];

		if (i == 0)
			s += gameSeat.getTableSeat().getUser().getName();

		else if (seats.length >= 3 && i < seats.length - 1)
			s += ", " + gameSeat.getTableSeat().getUser().getName();

		else
			s += " and " + gameSeat.getTableSeat().getUser().getName();
	}

	if (seats.length > 1)
		s += " splits pot: " + pot + ".";

	else
		s += " wins pot: " + pot + ".";

	return s;
}

module.exports = ShowMuckState;