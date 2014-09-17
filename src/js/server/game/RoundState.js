var GameState = require("./GameState");
var FunctionUtil = require("../../utils/FunctionUtil");
var PocketCardsMessage = require("../../proto/messages/PocketCardsMessage");
var ButtonData = require("../../proto/data/ButtonData");
var CardData = require("../../proto/data/CardData");
var GameSeatPrompt = require("./GameSeatPrompt");
var ActionMessage = require("../../proto/messages/ActionMessage");
var BetsToPotMessage = require("../../proto/messages/BetsToPotMessage");
var PotMessage = require("../../proto/messages/PotMessage");
var CommunityCardsMessage = require("../../proto/messages/CommunityCardsMessage");

/**
 * Manage a round of beting.
 * @class RoundState
 */
function RoundState() {
	GameState.call(this);

	this.prompt = null;

	// This is index in the gameSeats array in the game object,
	// not the seatIndex.
	this.gameSeatIndexToSpeak = 0;
	this.spokenAtCurrentBet = [];
	this.raiseTimes = 0;

	console.log("********* entering round state...");
}

FunctionUtil.extend(RoundState, GameState);

/**
 * Run the state.
 * @method run
 */
RoundState.prototype.run = function() {
	if (!this.hasDealtPocketCards())
		this.dealPocketCards();

	else
		this.dealCommunityCards();

	if (this.getNumberOfPlayersWithChips() < 2) {
		if (this.game.getCommunityCards().length == 5)
			this.game.setGameState(new ShowMuckState());

		else
			this.game.setGameState(new RoundState());

		return;
	}

	this.ensureGameSeatIndexToSpeakNotFolded();

	/*for (gameSeat in game.gameSeats) {
		gameSeat.disableAllPresets();
		gameSeat.ensureCurrentPresetIsValid();
	}*/

	this.ask();
}

/**
 * Ask next player.
 * @method ask
 */
RoundState.prototype.ask = function() {
	var gameSeat = this.game.getGameSeats()[this.gameSeatIndexToSpeak];

	if (!gameSeat.getChips()) {
		throw new Error("not implemented");
		this.spokenAtCurrentBet.push(gameSeat);
		this.askDone();
		return;
	}

	this.prompt = new GameSeatPrompt(gameSeat);

	this.prompt.addButton(new ButtonData(ButtonData.FOLD));

	if (this.canCheck(gameSeat)) {
		this.prompt.setDefaultButton(ButtonData.CHECK);
		this.prompt.addButton(new ButtonData(ButtonData.CHECK));
	} else {
		this.prompt.setDefaultButton(ButtonData.FOLD);
		this.prompt.addButton(new ButtonData(ButtonData.CALL, this.getCostToCall(gameSeat)));
	}

	/*if (this.canRaise(gameSeat)) {

	}*/

	//this.updateAndSendPresets();

	this.prompt.on(GameSeatPrompt.COMPLETE, this.onPromptComplete, this);
	this.prompt.ask();
}

/**
 * Prompt complete.
 * @method onPromptComplete
 * @private
 */
RoundState.prototype.onPromptComplete = function() {
	var prompt = this.prompt;

	this.prompt.off(GameSeatPrompt.COMPLETE, this.onPromptComplete, this);
	this.prompt = null;

	var gameSeat = this.game.getGameSeats()[this.gameSeatIndexToSpeak];

	/*if (prompt.isRaiseBet() && this.canRaise(gameSeat)) {

	}*/

	console.log("************* prompt complete..");

	if (prompt.isCheckCall()) {
		this.spokenAtCurrentBet.push(gameSeat);

		if (this.canCheck(gameSeat))
			this.game.send(new ActionMessage(gameSeat.getSeatIndex, ActionMessage.CHECK));

		else
			this.game.send(new ActionMessage(gameSeat.getSeatIndex, ActionMessage.CALL));

		gameSeat.makeBet(this.getCostToCall(gameSeat));
		this.askDone();
	} else {
		gameSeat.fold();
		this.askDone();
	}
}

/**
 * Get number of players with chips still in the game.
 * @method getNumberOfPlayersWithChips
 * @private
 */
RoundState.prototype.getNumberOfPlayersWithChips = function() {
	var cnt = 0;

	for (var g = 0; g < this.game.getGameSeats().length; g++) {
		var gameSeat = this.game.getGameSeats()[g];

		console.log("chips: " + gameSeat.getChips());

		if (!gameSeat.isFolded() && gameSeat.getChips() > 0)
			cnt++;
	}

	console.log("with chips: " + cnt);

	return cnt;
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
 * Deal community cards.
 * @method dealCommunityCards
 */
RoundState.prototype.dealCommunityCards = function() {
	var numCards = 0;

	if (this.game.getCommunityCards().length == 0)
		numCards = 3;

	else
		numCards = 1;

	for (var i = 0; i < numCards; i++) {
		var c = this.game.getNextCard();

		var m = new CommunityCardsMessage();
		m.setAnimate(true);
		m.setFirstIndex(this.game.getCommunityCards().length);
		m.addCard(c);

		this.game.getCommunityCards().push(c);

		this.game.send(m);
	}
}

/**
 * Have we dealt pocket cards?
 * @method hasDealtPocketCards
 * @private
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

/**
 * Ensure gameSeatIndexToSpeak has not folded.
 * @method ensureGameSeatIndexToSpeakNotFolded
 * @private
 */
RoundState.prototype.ensureGameSeatIndexToSpeakNotFolded = function() {
	if (this.gameSeatIndexToSpeak >= this.game.getGameSeats().length)
		this.gameSeatIndexToSpeak = 0;

	while (this.game.getGameSeats()[this.gameSeatIndexToSpeak].isFolded()) {
		this.gameSeatIndexToSpeak++;
		if (this.gameSeatIndexToSpeak >= this.game.getGameSeats().length)
			this.gameSeatIndexToSpeak = 0;
	}
}

/**
 * Get highest bet.
 * @method getHighestBet
 * @private
 */
RoundState.prototype.getHighestBet = function() {
	var high = 0;

	for (var g = 0; g < this.game.getGameSeats().length; g++) {
		var gameSeat = this.game.getGameSeats()[g];

		if (gameSeat.getBet() > high)
			high = gameSeat.getBet();
	}

	return high;
}

/**
 * Can this gameSeat check.
 * @method canCheck
 * @private
 */
RoundState.prototype.canCheck = function(gameSeat) {
	return gameSeat.getBet() >= this.getHighestBet();
}

/**
 * Get cost to call.
 * @method getCostToCall
 * @private
 */
RoundState.prototype.getCostToCall = function(gameSeat) {
	var cand = this.getHighestBet() - gameSeat.getBet();

	if (cand > gameSeat.getChips())
		cand = gameSeat.getChips();

	console.log("get cost to call: " + cand + "highest: " + this.getHighestBet());

	return cand;
}

/**
 * Increase gameSeatIndexToSpeak and make sure
 * it is a player still in the game.
 * @method advanceSpeaker
 * @private
 */
RoundState.prototype.advanceSpeaker = function() {
	this.gameSeatIndexToSpeak++;

	if (this.gameSeatIndexToSpeak >= this.game.getGameSeats().length)
		this.gameSeatIndexToSpeak = 0;

	this.ensureGameSeatIndexToSpeakNotFolded();
}

/**
 * After asking.
 * @method askDone
 * @private
 */
RoundState.prototype.askDone = function() {
	console.log("ask done...");

	if (this.game.getNumPlayersRemaining() == 1) {
		/*for (gameSeat in game.gameSeats) {
			gameSeat.disableAllPresets();
			gameSeat.ensureCurrentPresetIsValid();
			gameSeat.sendPresets();
		}*/

		this.returnExcessiveBets();
		this.betsToPot();
		this.game.setGameState(new ShowMuckState());
	} else if (this.allHasSpoken()) {
		for (var g = 0; g < this.game.getGameSeats().length; g++) {
			var gameSeat = this.game.getGameSeats()[g];
			/*gameSeat.disableAllPresets();
			gameSeat.ensureCurrentPresetIsValid();
			gameSeat.sendPresets();*/

			this.returnExcessiveBets();
			this.betsToPot();

			if (this.game.getCommunityCards().length == 5)
				this.game.setGameState(new ShowMuckState());

/*			else
				this.game.setGameState(new RoundState());*/
		}
	} else {
		console.log("asking againg...");
		this.advanceSpeaker();
		this.ask();
	}
}

/**
 * Has all the remaining players spoken about the bet?
 * @method allHasSpoken
 * @private
 */
RoundState.prototype.allHasSpoken = function() {
	for (var g = 0; g < this.game.getGameSeats().length; g++) {
		var gameSeat = this.game.getGameSeats()[g];

		if (!gameSeat.isFolded() && this.spokenAtCurrentBet.indexOf(gameSeat) < 0)
			return false;
	}

	return true;
}

/**
 * Bets to pot.
 */
RoundState.prototype.betsToPot = function() {
	for (var g = 0; g < this.game.getGameSeats().length; g++) {
		var gameSeat = this.game.getGameSeats()[g];
		gameSeat.betToPot();
	}

	this.game.send(new BetsToPotMessage());
	this.game.send(new PotMessage(this.game.getPots()));
}


/**
 * Return excessive bets.
 * @method returnExcessiveBets
 */
RoundState.prototype.returnExcessiveBets = function() {
	var bets = [];

	for (var g = 0; g < this.game.getGameSeats(); g++) {
		var gameSeat = this.game.getGameSeats()[g];
		bets.push(gameSeat.getBet());
	}

	bets.sort();
	bets.reverse();

	var secondHighest = bets[1];

	for (var g = 0; g < this.game.getGameSeats(); g++) {
		var gameSeat = this.game.getGameSeats()[g];
		if (gameSeat.getBet() > secondHighest)
			gameSeat.returnBet(gameSeat.bet - secondHighest);
	}
}

module.exports = RoundState;