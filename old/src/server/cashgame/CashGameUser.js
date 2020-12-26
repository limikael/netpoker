/**
 * Server.
 * @module server
 */

var EventDispatcher = require("yaed");
var ButtonsMessage = require("../../proto/messages/ButtonsMessage");
var ButtonClickMessage = require("../../proto/messages/ButtonClickMessage");
var TableInfoMessage = require("../../proto/messages/TableInfoMessage");
var ButtonData = require("../../proto/data/ButtonData");
var CashGameBuyChipsPrompt = require("./CashGameBuyChipsPrompt");
var Backend = require("../backend/Backend");
var TableSeatSettings = require("../table/TableSeatSettings");
var BaseTableSeat = require("../table/BaseTableSeat");
var CheckboxMessage = require("../../proto/messages/CheckboxMessage");
var inherits = require("inherits");

/**
 * A user seated at a table.
 * @class CashGameUser
 * @extends EventDispatcher
 */
function CashGameUser(tableSeat, user) {
	this.tableSeat = tableSeat;
	this.user = user;
	this.sitInCompleted = false;
	this.leaving = false;
	this.chips = 0;
	this.sittingout = false;
	this.settings = new TableSeatSettings();

	this.tableSeat.on(ButtonClickMessage.TYPE, this.onTableSeatButtonClick, this);
	this.tableSeat.on(BaseTableSeat.SETTINGS_CHANGED, this.onTableSeatSettingsChanged, this);
}

inherits(CashGameUser, EventDispatcher);

CashGameUser.DONE = "done";
CashGameUser.READY = "ready";

/**
 * Get seated user.
 * @method getUser
 */
CashGameUser.prototype.getUser = function() {
	return this.user;
}

/**
 * Sit in user.
 * @method sitIn
 */
CashGameUser.prototype.sitIn = function() {
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
CashGameUser.prototype.onBuyChipsPromptComplete = function() {
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

		this.trigger(CashGameUser.READY);
	}

	this.tableSeat.send(this.getTableInfoMessage());
}

/**
 * Buy chips prompt complete.
 * @method onBuyChipsPromptCancel
 */
CashGameUser.prototype.onBuyChipsPromptCancel = function() {
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
CashGameUser.prototype.isInGame = function() {
	return this.sitInCompleted && !this.sittingout && !this.leaving;
}

/**
 * Get chips.
 * @method getChips
 */
CashGameUser.prototype.getChips = function() {
	if (isNaN(this.chips))
		throw new Error("chips is NaN");

	//console.log("get chisp: " + this.chips);
	return this.chips;
}

/**
 * Set chips.
 * @method setChips
 */
CashGameUser.prototype.setChips = function(value) {
	//console.log("setting chips: " + value);
	this.chips = value;
}

/**
 * Leave.
 * @method leave
 */
CashGameUser.prototype.leave = function() {
	//console.log("****************** CashGameUser::leave, leaving="+this.leaving);

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
	backend.call(Backend.SIT_OUT, params).then(
		this.onSitoutCallComplete.bind(this),
		this.onSitoutCallError.bind(this)
	);
}

/**
 * Sitout call complete.
 * @method onSitoutCallComplete
 * @private
 */
CashGameUser.prototype.onSitoutCallComplete = function() {
	this.cleanupAndNotifyDone();
}

/**
 * Clean up listeners and notify that we are done.
 * This instance should be considered disposed of after this.
 * @method cleanupAndNotifyDone
 * @private
 */
CashGameUser.prototype.cleanupAndNotifyDone = function() {
	//console.log("********** notifying done in table seat user");

	this.tableSeat.off(ButtonClickMessage.TYPE, this.onTableSeatButtonClick, this);
	this.tableSeat.off(BaseTableSeat.SETTINGS_CHANGED, this.onTableSeatSettingsChanged, this);
	this.trigger(CashGameUser.DONE);
}

/**
 * Sitout call error.
 * @method onSitoutCallError
 * @private
 */
CashGameUser.prototype.onSitoutCallError = function() {
	console.log("sitout call failed!!!");
	this.trigger(CashGameUser.DONE);
}

/**
 * Is this seat currently in reserved mode?
 * @method isReserved
 */
CashGameUser.prototype.isReserved = function() {
	if (this.buyChipsPrompt)
		return true;

	else
		return false;
}

/**
 * Is this table seat user sitting out?
 * @method isSitout
 */
CashGameUser.prototype.isSitout = function() {
	return this.sittingout;
}

/**
 * Sit out the table seat user.
 * @method sitout
 */
CashGameUser.prototype.sitout = function() {
	var b = new ButtonsMessage();
	b.addButton(new ButtonData(ButtonData.LEAVE));
	b.addButton(new ButtonData(ButtonData.IM_BACK));
	this.tableSeat.send(b);

	this.sittingout = true;
	this.settings.set(CheckboxMessage.SITOUT_NEXT, true);
	this.tableSeat.send(new CheckboxMessage(CheckboxMessage.SITOUT_NEXT, true));
	this.tableSeat.send(this.getTableInfoMessage());

	this.tableSeat.getTable().send(this.tableSeat.getSeatInfoMessage());
}

/**
 * Get TableInfoMessage
 * @method getTableInfoMessage
 */
CashGameUser.prototype.getTableInfoMessage = function() {
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
CashGameUser.prototype.onTableSeatButtonClick = function(m) {
	if (this.leaving)
		return;

	if (this.sittingout && m.getButton() == ButtonData.IM_BACK)
		this.sitBackIn();

	if (this.sittingout && m.getButton() == ButtonData.LEAVE)
		this.leave();
}

/**
 * Settings changed.
 * @method onTableSeatSettingsChanged
 */
CashGameUser.prototype.onTableSeatSettingsChanged = function() {
	//console.log("###################### settings changed: "+);

	if (this.leaving)
		return;

	if (this.sittingout &&
		!this.settings.get(CheckboxMessage.SITOUT_NEXT)) {
		this.sitBackIn();
		this.tableSeat.send(new ButtonsMessage());
	} else if (!this.sittingout &&
		this.settings.get(CheckboxMessage.SITOUT_NEXT) &&
		!this.tableSeat.getTable().getCurrentGame()) {
		this.sitout();
	}
}

/**
 * Sit the user back in after sitout.
 * @method sitBackIn
 * @private
 */
CashGameUser.prototype.sitBackIn = function() {
	if (this.leaving)
		return;

	if (!this.sittingout)
		throw new Error("not sitting out");

	this.sittingout = false;
	this.tableSeat.getTable().send(this.tableSeat.getSeatInfoMessage());
	this.tableSeat.send(this.getTableInfoMessage());

	this.settings.set(CheckboxMessage.SITOUT_NEXT, false);
	this.tableSeat.send(new CheckboxMessage(CheckboxMessage.SITOUT_NEXT, false));

	this.trigger(CashGameUser.READY);
}

/**
 * Get settings.
 * @method getSettings
 */
CashGameUser.prototype.getSettings = function() {
	return this.settings;
}

module.exports = CashGameUser;