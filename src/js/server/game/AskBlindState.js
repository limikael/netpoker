var FunctionUtil = require("../../utils/FunctionUtil");
var EventDispatcher = require("../../utils/EventDispatcher");
var GameState = require("./GameState");
var GameSeat = require("./GameSeat");
var GameSeatPrompt = require("./GameSeatPrompt");
var ButtonData = require("../../proto/data/ButtonData");

/**
 * Ask blind state.
 * @class AskBlindState
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
	this.prompt.on(GameSeatPrompt.COMPLETE, this.onPromptComplete, this);
	this.prompt.ask();
}

/**
 * Prompt complete.
 */
AskBlindState.prototype.onPromptComplete = function() {
	var button = this.prompt.getButton();
	var gameSeat = this.prompt.getGameSeat();

	this.prompt.off(GameSeatPrompt.COMPLETE, this.onPromptComplete, this);
	this.prompt = null;

	if (button == ButtonData.POST_BB || button == ButtonData.POST_SB) {
		this.game.addGameSeat(gameSeat);
	} else {
		gameSeat.getTableSeat().sitout();
	}

	this.askDone();
}

/**
 * Ask done.
 */
AskBlindState.prototype.askDone = function() {
	var table = this.game.getTable();

	if (this.askTableSeatIndex == table.getDealerButtonIndex()) {
		console.log("ask complete!!!");
		return;
	}

	this.askTableSeatIndex = table.getNextSeatIndexInGame(this.askTableSeatIndex);
	this.askNextBlind();
}

/**
 * Get current blind.
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
 * Get current blind amout.
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

module.exports = AskBlindState;