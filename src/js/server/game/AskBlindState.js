var FunctionUtil = require("../../utils/FunctionUtil");
var EventDispatcher = require("../../utils/EventDispatcher");
var GameState = require("./GameState");
var GameSeat = require("./GameSeat");
var GameSeatPrompt = require("./GameSeatPrompt");
var ButtonData = require("../../proto/data/ButtonData");
var FinishedState = require("./FinishedState");
var RoundState = require("./RoundState");

/**
 * During this state, we ask each participating user if they want to pay
 * the required blind to join the game. If enough players join, we
 * proceed with setting a RoundState as next state for the game object.
 * If the number of players is not enough to start the game, we cancel
 * the game by setting a FinishedState as next state instead.
 * @class AskBlindState
 * @extends GameState
 * @constructor
 */
function AskBlindState() {
	GameState.call(this);
}

FunctionUtil.extend(AskBlindState, GameState);

/**
 * Run the state.
 * @method run
 */
AskBlindState.prototype.run = function() {
	var table = this.game.getTable();
	this.askTableSeatIndex = table.getNextSeatIndexInGame(table.getDealerButtonIndex());

	this.askNextBlind();
}

/**
 * Ask next blind.
 * @method askNextBlind
 * @private
 */
AskBlindState.prototype.askNextBlind = function() {
	console.log("********** ask next blind, ask index=" + this.askTableSeatIndex);

	var gameSeat = this.game.getGameSeatForSeatIndex(this.askTableSeatIndex);

	if (!gameSeat)
		gameSeat = new GameSeat(this.game, this.askTableSeatIndex)

	if (!this.getCurrentBlindAmount()) {
		this.game.addGameSeat(gameSeat);
		this.askDone();
		return;
	}

	this.prompt = new GameSeatPrompt(gameSeat);

	var b = new ButtonData(this.getCurrentBlind(), this.getCurrentBlindAmount());
	this.prompt.addButton(b);
	this.prompt.addButton(new ButtonData(ButtonData.SIT_OUT));
	this.prompt.setDefaultButton(ButtonData.SIT_OUT);
	this.prompt.on(GameSeatPrompt.COMPLETE, this.onPromptComplete, this);
	this.prompt.ask();
}

/**
 * Prompt complete.
 * @method onPromptComplete
 * @private
 */
AskBlindState.prototype.onPromptComplete = function() {
	var button = this.prompt.getButton();
	var gameSeat = this.prompt.getGameSeat();

	this.prompt.off(GameSeatPrompt.COMPLETE, this.onPromptComplete, this);
	this.prompt = null;

	if (button == ButtonData.POST_BB || button == ButtonData.POST_SB) {
		this.game.addGameSeat(gameSeat);
	} else {
		//gameSeat.getTableSeat().sitout();
	}

	this.askDone();
}

/**
 * Ask done.
 * @method askDone
 * @private
 */
AskBlindState.prototype.askDone = function() {
	var table = this.game.getTable();

	if (this.askTableSeatIndex == table.getDealerButtonIndex()) {
		console.log("ask complete!!!");

		// Should be round state...
		this.game.setGameState(new RoundState()); //FinishedState());
		return;
	}

	this.askTableSeatIndex = table.getNextSeatIndexInGame(this.askTableSeatIndex);
	this.askNextBlind();
}

/**
 * Get the blind that we are currently asking for.
 * @method getCurrentBlind
 * @private
 */
AskBlindState.prototype.getCurrentBlind = function() {
	switch (this.game.getNumInGame()) {
		case 0:
			return ButtonData.POST_SB;

		case 1:
			return ButtonData.POST_BB;

		default:
			return null;
	}
}

/**
 * Get the amount of the blind that we are currently asking for.
 * @method getCurrentBlindAmount
 * @private
 */
AskBlindState.prototype.getCurrentBlindAmount = function() {
	var cand;

	/*	if (!this.game.getTable().getStake())
		throw new Error("Table doens't have a stake");*/

	switch (this.getCurrentBlind()) {
		case ButtonData.POST_SB:
			cand = this.game.getTable().getStake() / 2;
			break;

		case ButtonData.POST_BB:
			cand = this.game.getTable().getStake();
			break;

		default:
			cand = 0;
	}

	return cand;
}

AskBlindState.prototype.close = function() {
	console.log("hard close ask blind state, seatprompt=" + this.prompt);
	if (this.prompt) {
		this.prompt.close();
		this.prompt = null;
	}

}

module.exports = AskBlindState;