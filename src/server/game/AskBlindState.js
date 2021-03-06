/**
 * Server.
 * @module server
 */

var EventDispatcher = require("yaed");
var GameState = require("./GameState");
var GameSeat = require("./GameSeat");
var GameSeatPrompt = require("./GameSeatPrompt");
var ButtonData = require("../../proto/data/ButtonData");
var CheckboxMessage = require("../../proto/messages/CheckboxMessage");
var ActionMessage = require("../../proto/messages/ActionMessage");
var BetsToPotMessage = require("../../proto/messages/BetsToPotMessage");
var PotMessage = require("../../proto/messages/PotMessage");
var FinishedState = require("./FinishedState");
var RoundState = require("./RoundState");
var inherits = require("inherits");

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

	this.headsUp=false;
}

inherits(AskBlindState, GameState);

/**
 * Run the state.
 * @method run
 */
AskBlindState.prototype.run = function() {
	var table = this.game.getTable();

	this.askTableSeatIndex = table.getNextSeatIndexInGame(table.getDealerButtonIndex());

	if (table.getAnte() > 0) {
		console.log("********** ante applies...");

		var seatIndex = table.getDealerButtonIndex();
		do {
			seatIndex = table.getNextSeatIndexInGame(seatIndex);

			var gameSeat = new GameSeat(this.game, seatIndex);
			this.game.addGameSeat(gameSeat);
			gameSeat.makeBet(this.getAnteAmountForSeat(gameSeat));
			gameSeat.betToPot();
			table.send(new ActionMessage(gameSeat.getSeatIndex(), ActionMessage.ANTE));
		} while (seatIndex != table.getDealerButtonIndex());

		table.send(new BetsToPotMessage());
		table.send(new PotMessage(this.game.getPots()));
	}

	if (table.getNumInGame()<2)
		throw new Error("Trying to start a game with fewer than 2 players");

	if (table.getNumInGame()==2)
		this.headsUp=true;

	this.haveBlinds = 0;
	this.askNextBlind();
}

/**
 * Get the ante amount the seat should pay.
 * @method getAnteAmountForSeat
 */
AskBlindState.prototype.getAnteAmountForSeat = function(gameSeat) {
	var cand = this.game.getTable().getAnte();

	if (cand > gameSeat.getTableSeat().getChips())
		cand = gameSeat.getTableSeat().getChips();

	return cand;
}

/**
 * Ask next blind.
 * @method askNextBlind
 * @private
 */
AskBlindState.prototype.askNextBlind = function() {
	//console.log("********** ask next blind, ask index=" + this.askTableSeatIndex);

	var gameSeat = this.game.getGameSeatForSeatIndex(this.askTableSeatIndex);

	if (!gameSeat)
		gameSeat = new GameSeat(this.game, this.askTableSeatIndex)

	if (!this.getCurrentBlind()) {
		this.game.addGameSeat(gameSeat);
		this.askDone();
		return;
	}

	this.prompt = new GameSeatPrompt(gameSeat);

	this.prompt.addButton(ButtonData.SIT_OUT);
	this.prompt.addButton(this.getCurrentBlind(), this.getCurrentBlindAmount());
	this.prompt.setDefaultButton(ButtonData.SIT_OUT);
	this.prompt.on(GameSeatPrompt.COMPLETE, this.onPromptComplete, this);
	this.prompt.useTableSeatSetting(CheckboxMessage.SITOUT_NEXT, ButtonData.SIT_OUT);
	this.prompt.useTableSeatSetting(CheckboxMessage.AUTO_POST_BLINDS, this.getCurrentBlind());
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
		if (!gameSeat.getTableSeat().getChips())
			throw new Error("the user doesn't have any money!");

		var blindAmount = this.getCurrentBlindAmount();

		if (blindAmount > gameSeat.getTableSeat().getChips())
			blindAmount = gameSeat.getTableSeat().getChips();

		gameSeat.makeBet(blindAmount);

		//gameSeat.getTableSeat().notifyBigBlindPaid();
		this.haveBlinds++;
		this.game.addGameSeat(gameSeat);
	} else {
		gameSeat.getTableSeat().sitout();
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
		if (this.game.getGameSeats().length >= 2) {
			this.game.setGameState(new RoundState());
			this.game.getTable().sendTableInfoMessages();
		} else {
			this.cancel();
		}
	} else if (table.getNumInGame() < 2) {
		this.cancel();
	} else {
		this.askTableSeatIndex = table.getNextSeatIndexInGame(this.askTableSeatIndex);
		this.askNextBlind();
	}
}

/**
 * Get the blind that we are currently asking for.
 * @method getCurrentBlind
 * @private
 */
AskBlindState.prototype.getCurrentBlind = function() {
	if (this.headsUp) {
		switch (this.haveBlinds) {
			case 0:
				return ButtonData.POST_BB;

			case 1:
				return ButtonData.POST_SB;

			default:
				return null;
		}
	}

	switch (this.haveBlinds) {
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

/**
 * Hard close the state. Only for debugging.
 * @method close
 */
AskBlindState.prototype.close = function() {
	if (this.prompt) {
		this.prompt.close();
		this.prompt = null;
	}
}

/**
 * Return bets and cancel the game.
 * @method cancel
 * @private
 */
AskBlindState.prototype.cancel = function() {
	console.log("Canceling game");
	this.game.getTable().chat(null, "Not enough players to start the hand.");

	for (var g = 0; g < this.game.getGameSeats().length; g++) {
		var gameSeat = this.game.getGameSeats()[g];

		gameSeat.returnBet(gameSeat.getBet());
	}

	this.game.setGameState(new FinishedState());

	this.game.getTable().sendTableInfoMessages();
}

module.exports = AskBlindState;