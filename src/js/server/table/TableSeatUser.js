var FunctionUtil = require("../../utils/FunctionUtil");
var EventDispatcher = require("../../utils/EventDispatcher");
var TableSeatBuyChipsPrompt = require("./TableSeatBuyChipsPrompt");
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

	this.buyChipsPrompt = new TableSeatBuyChipsPrompt(this.tableSeat);
	this.buyChipsPrompt.on(TableSeatBuyChipsPrompt.COMPLETE, this.onBuyChipsPromptComplete, this);
	this.buyChipsPrompt.on(TableSeatBuyChipsPrompt.CANCEL, this.onBuyChipsPromptCancel, this);
	this.buyChipsPrompt.ask();
}

/**
 * Buy chips prompt complete.
 */
TableSeatUser.prototype.onBuyChipsPromptComplete = function() {
	this.buyChipsPrompt.off(TableSeatBuyChipsPrompt.COMPLETE, this.onBuyChipsPromptComplete, this);
	this.buyChipsPrompt.off(TableSeatBuyChipsPrompt.CANCEL, this.onBuyChipsPromptCancel, this);

	this.sitInCompleted = true;
	this.chips = this.buyChipsPrompt.getChips();
	this.buyChipsPrompt = null;

	if (this.leaving) {
		this.leave();
	} else {
		//this.tableSeat.table.send(this.tableSeat.getSeatInfoMessage());

		this.trigger(TableSeatUser.READY);
	}

	//this.tableSeat.send(getTableInfoMessage());
}

/**
 * Buy chips prompt complete.
 */
TableSeatUser.prototype.onBuyChipsPromptCancel = function() {
	this.buyChipsPrompt.off(TableSeatBuyChipsPrompt.COMPLETE, this.onBuyChipsPromptComplete, this);
	this.buyChipsPrompt.off(TableSeatBuyChipsPrompt.CANCEL, this.onBuyChipsPromptCancel, this);
	this.buyChipsPrompt = null;
	this.leave();
}

/**
 * Is this table seat user in the game?
 */
TableSeatUser.prototype.isInGame = function() {
	return this.sitInCompleted;
}

/**
 * Get chips.
 */
TableSeatUser.prototype.getChips = function() {
	return this.chips;
}

/**
 * Leave.
 */
TableSeatUser.prototype.leave = function() {
	this.leaving = true;

	if (this.buyChipsPrompt)
		return;

	if (!this.sitInCompleted) {
		this.trigger(TableSeatUser.DONE);
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

module.exports = TableSeatUser;