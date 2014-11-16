/**
 * Server.
 * @module server
 */

var GameState = require("./GameState");
var PocketCardsMessage = require("../../proto/messages/PocketCardsMessage");
var ButtonData = require("../../proto/data/ButtonData");
var CardData = require("../../proto/data/CardData");
var GameSeatPrompt = require("./GameSeatPrompt");
var ActionMessage = require("../../proto/messages/ActionMessage");
var PresetButtonsMessage = require("../../proto/messages/PresetButtonsMessage");
var BetsToPotMessage = require("../../proto/messages/BetsToPotMessage");
var PotMessage = require("../../proto/messages/PotMessage");
var CommunityCardsMessage = require("../../proto/messages/CommunityCardsMessage");
var ShowMuckState = require("./ShowMuckState");
var inherits = require("inherits");

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

	this.hasRun = false;
}

inherits(RoundState, GameState);

/**
 * Run the state.
 * @method run
 */
RoundState.prototype.run = function() {
	if (this.hasRun)
		throw new Exception("can only run each state once");

	this.hasRun = true;

	if (!this.hasDealtPocketCards()) {
		this.dealPocketCards();
	} else {
		this.dealCommunityCards();
	}

	//console.log("number of players with chips: " + this.getNumberOfPlayersWithChips());

	// In case there is only one player left with chips, i.e. all others
	// are all in, just go to the next state.
	if (this.getNumberOfPlayersWithChips() < 2) {
		if (this.game.getCommunityCards().length == 5)
			this.game.setGameState(new ShowMuckState());

		else
			this.game.setGameState(new RoundState());

		return;
	}

	this.ensureGameSeatIndexToSpeakNotFolded();

	for (var g = 0; g < this.game.getGameSeats().length; g++) {
		var gameSeat = this.game.getGameSeats()[g];
		gameSeat.disableAllPresets();
	}

	this.ask();
}

/**
 * Ask next player.
 * @method ask
 */
RoundState.prototype.ask = function() {
	var gameSeat = this.game.getGameSeats()[this.gameSeatIndexToSpeak];

	if (!gameSeat.getChips()) {
		this.spokenAtCurrentBet.push(gameSeat);
		this.askDone();
		return;
	}

	this.prompt = new GameSeatPrompt(gameSeat);

	this.prompt.addButton(ButtonData.FOLD);

	if (this.canCheck(gameSeat)) {
		this.prompt.setDefaultButton(ButtonData.CHECK);
		this.prompt.addButton(ButtonData.CHECK);
	} else {
		this.prompt.setDefaultButton(ButtonData.FOLD);
		this.prompt.addButton(ButtonData.CALL, this.getCostToCall(gameSeat));
	}

	if (this.canRaise(gameSeat)) {
		var minRaise = this.getMinRaiseTo(gameSeat);
		var maxRaise = this.getMaxRaiseTo(gameSeat);

		if (this.getHighestBet() == 0)
			this.prompt.addButton(ButtonData.BET, minRaise);
		else
			this.prompt.addButton(ButtonData.RAISE, minRaise);

		if (minRaise != maxRaise) {
			this.prompt.setSliderValues(this.prompt.getLastButtonIndex(), minRaise, maxRaise);
			/*
			b.amountPresets.push(new PresetButtonData("MINIMUM",minRaise));

			var total:Int=game.getTotalOnTable();

			if (Math.round(total/3)>minRaise && Math.round(total/3)<maxRaise)
				b.amountPresets.push(new PresetButtonData("1/3 POT",Math.round(total/3)));

			if (Math.round(total/2)>minRaise && Math.round(total/2)<maxRaise)
				b.amountPresets.push(new PresetButtonData("1/2 POT",Math.round(total/2)));

			if (Math.round(total)>minRaise && Math.round(total)<maxRaise)
				b.amountPresets.push(new PresetButtonData("POT",Math.round(total)));

			b.amountPresets.push(new PresetButtonData("ALL IN",maxRaise));
			*/
		}

	}

	this.updateAndSendPresets();

	this.prompt.on(GameSeatPrompt.COMPLETE, this.onPromptComplete, this);
	this.prompt.ask();
}

/**
 * Update and send presets.
 * @method updateAndSendPresets
 * @private
 */
RoundState.prototype.updateAndSendPresets = function() {
	for (var g = 0; g < this.game.getGameSeats().length; g++) {
		var gameSeat = this.game.getGameSeats()[g];

		var oldPreset = gameSeat.getCurrentPreset();
		var oldPresetValue = gameSeat.getCurrentPresetValue();
		gameSeat.disableAllPresets();

		if (!gameSeat.isFolded()) {
			if (this.spokenAtCurrentBet.indexOf(gameSeat) < 0) {
				gameSeat.enablePreset(ButtonData.FOLD);
				gameSeat.enablePreset(ButtonData.CALL_ANY);

				if (this.canCheck(gameSeat)) {
					gameSeat.enablePreset(ButtonData.CHECK);
					gameSeat.enablePreset(ButtonData.CHECK_FOLD);
				} else {
					if (oldPreset == ButtonData.CHECK_FOLD)
						gameSeat.setCurrentPreset(ButtonData.FOLD);

					gameSeat.enablePreset(ButtonData.CALL, this.getCostToCall(gameSeat))
				}
			}
		}

		if (gameSeat.isPresetValid(oldPreset, oldPresetValue))
			gameSeat.setCurrentPreset(oldPreset, oldPresetValue);

		if (gameSeat == this.game.getGameSeats()[this.gameSeatIndexToSpeak])
			gameSeat.send(new PresetButtonsMessage());

		else
			gameSeat.sendPresets();
	}
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

	if (prompt.isRaiseBet() && this.canRaise(gameSeat)) {
		this.spokenAtCurrentBet = [gameSeat];

		var value = prompt.getValue();
		if (value < this.getMinRaiseTo(gameSeat))
			value = this.getMinRaiseTo(gameSeat);

		if (value > this.getMaxRaiseTo(gameSeat))
			value = this.getMaxRaiseTo(gameSeat);

		if (prompt.getButton() == ButtonData.RAISE)
			this.game.send(new ActionMessage(gameSeat.getSeatIndex(), ActionMessage.RAISE));

		else
			this.game.send(new ActionMessage(gameSeat.getSeatIndex(), ActionMessage.BET));

		gameSeat.makeBet(value - gameSeat.getBet());
		this.raiseTimes++;

		this.askDone();
	} else if (prompt.isCheckCall()) {
		this.spokenAtCurrentBet.push(gameSeat);

		if (this.canCheck(gameSeat))
			this.game.send(new ActionMessage(gameSeat.getSeatIndex(), ActionMessage.CHECK));

		else
			this.game.send(new ActionMessage(gameSeat.getSeatIndex(), ActionMessage.CALL));

		gameSeat.makeBet(this.getCostToCall(gameSeat));
		this.askDone();
	} else {
		gameSeat.fold();
		this.askDone();
	}
}

/**
 * Get max raise.
 * @method getMaxRaiseTo
 * @private
 */
RoundState.prototype.getMaxRaiseTo = function(gameSeat) {
	var cand = gameSeat.getTableSeat().getChips() + gameSeat.getBet();

	return cand;
}

/**
 * Get min raise.
 * @method getMinRaiseTo
 * @private
 */
RoundState.prototype.getMinRaiseTo = function(gameSeat) {
	var cand = this.getHighestBet() + this.game.getTable().getStake();

	if (cand > gameSeat.getTableSeat().getChips() + gameSeat.getBet())
		cand = gameSeat.getTableSeat().getChips() + gameSeat.getBet();

	return cand;
}

/**
 * Get min raise.
 * @method getMinRaiseTo
 * @private
 */
RoundState.prototype.canRaise = function(gameSeat) {
	if (this.raiseTimes >= 4)
		return false;

	if (gameSeat.getTableSeat().getChips() <= this.getCostToCall(gameSeat))
		return false;

	for (var i = 0; i < this.game.getGameSeats().length; i++) {
		var gs = this.game.getGameSeats()[i];
		if (!gs.isFolded())
			if (gs.getTableSeat().getChips() > 0)
				if (gs != gameSeat)
					return true;
	}

	return false;
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

		if (!gameSeat.isFolded() && gameSeat.getChips() > 0)
			cnt++;
	}

	return cnt;
}

/**
 * Deal pocket cards.
 * @method dealPocketCards
 */
RoundState.prototype.dealPocketCards = function() {
	console.log("dealing pocket cards");

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
	console.log("dealing community cards");

	var numCards = 0;

	if (this.game.getCommunityCards().length == 0) {
		numCards = 3;
	} else {
		numCards = 1;
	}

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
	if (this.game.getNumPlayersRemaining() == 1) {
		this.disableAndSendAllPresets();
		this.returnExcessiveBets();
		this.betsToPot();
		this.game.setGameState(new ShowMuckState());
	} else if (this.allHasSpoken()) {
		this.disableAndSendAllPresets();
		this.returnExcessiveBets();
		this.betsToPot();

		if (this.game.getCommunityCards().length == 5)
			this.game.setGameState(new ShowMuckState());

		else {
			this.game.setGameState(new RoundState());
		}
	} else {
		this.advanceSpeaker();
		this.ask();
	}
}

/**
 * Disable and send all presets.
 * @method disableAndSendAllPresets
 */
RoundState.prototype.disableAndSendAllPresets = function() {
	for (var g = 0; g < this.game.getGameSeats().length; g++) {
		var gameSeat = this.game.getGameSeats()[g];

		gameSeat.disableAllPresets();
		gameSeat.sendPresets();
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
 * Send bets to the pot.
 * @method betsToPot
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

	for (var g = 0; g < this.game.getGameSeats().length; g++) {
		var gameSeat = this.game.getGameSeats()[g];
		bets.push(gameSeat.getBet());
	}

	bets.sort();
	bets.reverse();

	var secondHighest = bets[1];

	for (var g = 0; g < this.game.getGameSeats().length; g++) {
		var gameSeat = this.game.getGameSeats()[g];
		if (gameSeat.getBet() > secondHighest)
			gameSeat.returnBet(gameSeat.getBet() - secondHighest);
	}
}

module.exports = RoundState;