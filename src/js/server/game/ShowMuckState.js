var GameState = require("./GameState");
var FunctionUtil = require("../../utils/FunctionUtil");
var GameSeatPrompt = require("./GameSeatPrompt");
var FunctionUtil = require("../../utils/FunctionUtil");
var ButtonData = require("../../proto/data/ButtonData");
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
	var prompt=this.prompt;

	this.prompt.off(GameSeatPrompt.COMPLETE, this.onPromptComplete, this);
	this.prompt = null;

	var gameSeat = this.game.getGameSeats()[this.gameSeatIndexToSpeak];

	// the place that needs work...

	/*if (prompt.getButton()==ButtonData.SHOW)
		gameSeat.show();

	else
		gameSeat.muck();

	this.askDone();*/
}

/**
 * Must this seat show the cards?
 * @method mustShow
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

module.exports = ShowMuckState;