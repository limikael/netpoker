var FunctionUtil = require("../../utils/FunctionUtil");
var EventDispatcher = require("../../utils/EventDispatcher");
var ButtonsMessage = require("../../proto/messages/ButtonsMessage");
var ButtonClickMessage = require("../../proto/messages/ButtonClickMessage");
var TableInfoMessage = require("../../proto/messages/TableInfoMessage");
var ButtonData = require("../../proto/data/ButtonData");
var CashGameBuyChipsPrompt = require("../cashgame/CashGameBuyChipsPrompt");
var Backend = require("../backend/Backend");

/**
 * A user seated at a table.
 * @class TableSeatUser
 */
function TableSeatUser(tableSeat, user) {
	this.tableSeat = tableSeat;
	this.user = user;
	this.sitInCompleted = false;
	this.leaving = false;
	this.chips = 0;
	this.sittingout = false;

	this.tableSeat.on(ButtonClickMessage.TYPE, this.onTableSeatButtonClick, this);
}

FunctionUtil.extend(TableSeatUser, EventDispatcher);

TableSeatUser.DONE = "done";
TableSeatUser.READY = "ready";

/**
 * Get seated user.
 * @method getUser
 */
TableSeatUser.prototype.getUser = function() {
	return this.user;
}

/**
 * Sit in user.
 * @method sitIn
 */
TableSeatUser.prototype.sitIn = function() {
	if (this.sitInCompleted)
		throw "Already sitting in";

	if (this.buyChipsPrompt)
		throw "Buying";

	this.buyChipsPrompt = new CashGameBuyChipsPrompt(this.tableSeat);
	this.buyChipsPrompt.on(CashGameBuyChipsPrompt.COMPLETE, this.onBuyChipsPromptComplete, this);
	this.buyChipsPrompt.on(CashGameBuyChipsPrompt.CANCEL, this.onBuyChipsPromptCancel, this);

	this.tableSeat.getTable().send(this.tableSeat.getSeatInfoMessage());

	this.buyChipsPrompt.ask();
}

/**
 * Buy chips prompt complete.
 * @method onBuyChipsPromptComplete
 */
TableSeatUser.prototype.onBuyChipsPromptComplete = function() {
	this.buyChipsPrompt.off(CashGameBuyChipsPrompt.COMPLETE, this.onBuyChipsPromptComplete, this);
	this.buyChipsPrompt.off(CashGameBuyChipsPrompt.CANCEL, this.onBuyChipsPromptCancel, this);

	this.sitInCompleted = true;
	this.chips = this.buyChipsPrompt.getChips();
	this.getChips();

	this.buyChipsPrompt = null;

	if (this.leaving) {
		this.leave();
	} else {
		this.tableSeat.table.send(this.tableSeat.getSeatInfoMessage());

		this.trigger(TableSeatUser.READY);
	}

	this.tableSeat.send(this.getTableInfoMessage());
}

/**
 * Buy chips prompt complete.
 * @method onBuyChipsPromptCancel
 */
TableSeatUser.prototype.onBuyChipsPromptCancel = function() {
	//console.log("buy chips cancel..........");
	this.buyChipsPrompt.off(CashGameBuyChipsPrompt.COMPLETE, this.onBuyChipsPromptComplete, this);
	this.buyChipsPrompt.off(CashGameBuyChipsPrompt.CANCEL, this.onBuyChipsPromptCancel, this);
	this.buyChipsPrompt = null;
	this.leave();
}

/**
 * Is this table seat user in the game?
 * @method isInGame
 */
TableSeatUser.prototype.isInGame = function() {
	return this.sitInCompleted && !this.sittingout && !this.leaving;
}

/**
 * Get chips.
 * @method getChips
 */
TableSeatUser.prototype.getChips = function() {
	if (isNaN(this.chips))
		throw new Error("chips is NaN");

	//console.log("get chisp: " + this.chips);
	return this.chips;
}

/**
 * Set chips.
 * @method setChips
 */
TableSeatUser.prototype.setChips = function(value) {
	//console.log("setting chips: " + value);
	this.chips = value;
}

/**
 * Leave.
 * @method leave
 */
TableSeatUser.prototype.leave = function() {
	//console.log("****************** TableSeatUser::leave, leaving="+this.leaving);

	if (this.leaving)
		return;

	if (this.buyChipsPrompt)
		return;

	this.leaving = true;

	if (!this.sitInCompleted) {
		this.cleanupAndNotifyDone();
		return;
	}

	var params = {
		userId: this.user.getId(),
		tableId: this.tableSeat.getTable().getId(),
		amount: this.chips
	};

	var backend = this.tableSeat.getTable().getServices().getBackend();
	backend.call(Backend.SIT_OUT).then(
		this.onSitoutCallComplete.bind(this),
		this.onSitoutCallError.bind(this)
	);
}

/**
 * Sitout call complete.
 * @method onSitoutCallComplete
 * @private
 */
TableSeatUser.prototype.onSitoutCallComplete = function() {
	this.cleanupAndNotifyDone();
}

/**
 * Clean up listeners and notify that we are done.
 * This instance should be considered disposed of after this.
 * @method cleanupAndNotifyDone
 * @private
 */
TableSeatUser.prototype.cleanupAndNotifyDone = function() {
	//console.log("********** notifying done in table seat user");

	this.tableSeat.on(ButtonClickMessage.TYPE, this.onTableSeatButtonClick, this);
	this.trigger(TableSeatUser.DONE);
}

/**
 * Sitout call error.
 * @method onSitoutCallError
 * @private
 */
TableSeatUser.prototype.onSitoutCallError = function() {
	console.log("sitout call failed!!!");
	this.trigger(TableSeatUser.DONE);
}

/**
 * Is this seat currently in reserved mode?
 * @method isReserved
 */
TableSeatUser.prototype.isReserved = function() {
	if (this.buyChipsPrompt)
		return true;

	else
		return false;
}

/**
 * Is this table seat user sitting out?
 * @method isSitout
 */
TableSeatUser.prototype.isSitout = function() {
	return this.sittingout;
}

/**
 * Sit out the table seat user.
 * @method sitout
 */
TableSeatUser.prototype.sitout = function() {
	var b = new ButtonsMessage();
	b.addButton(new ButtonData(ButtonData.LEAVE));
	b.addButton(new ButtonData(ButtonData.IM_BACK));
	this.tableSeat.send(b);

	this.sittingout = true;

	this.tableSeat.getTable().send(this.tableSeat.getSeatInfoMessage());
}

/**
 * Get TableInfoMessage
 * @method getTableInfoMessage
 */
TableSeatUser.prototype.getTableInfoMessage = function() {
	if (!this.tableSeat.isInGame())
		return new TableInfoMessage();

	if (!this.tableSeat.getTable().getCurrentGame())
		return new TableInfoMessage("Please wait for another player to join the table.");

	var currentGame = this.tableSeat.getTable().getCurrentGame();

	if (!currentGame.isTableSeatInGame(this.tableSeat) && currentGame.isJoinComplete())
		return new TableInfoMessage("Please wait for the next hand.");

	return new TableInfoMessage();
}

/**
 * Handle table seat button click.
 * @method onTableSeatButtonClick
 * @private
 */
TableSeatUser.prototype.onTableSeatButtonClick = function(m) {
	if (this.leaving)
		return;

	if (this.sittingout && m.getButton() == ButtonData.IM_BACK)
		this.sitBackIn();

	if (this.sittingout && m.getButton() == ButtonData.LEAVE)
		this.leave();
}

/**
 * Sit the user back in after sitout.
 * @method sitBackIn
 * @private
 */
TableSeatUser.prototype.sitBackIn = function() {
	if (!this.sittingout)
		throw new Error("not sitting out");

	this.sittingout = false;
	this.tableSeat.getTable().send(this.tableSeat.getSeatInfoMessage());
	this.tableSeat.send(this.getTableInfoMessage());

	this.trigger(TableSeatUser.READY);
}

module.exports = TableSeatUser;