var FunctionUtil = require("../../utils/FunctionUtil");
var EventDispatcher = require("../../utils/EventDispatcher");
var Backend = require("../backend/Backend");
var ShowDialogMessage = require("../../proto/messages/ShowDialogMessage");
var ButtonData = require("../../proto/data/ButtonData");
var ProtoConnection = require("../../proto/ProtoConnection");
var ButtonClickMessage = require("../../proto/messages/ButtonClickMessage");

/**
 * Prompt user to buy chips.
 * @class TableSeatBuyChipsPrompt
 */
function TableSeatBuyChipsPrompt(tableSeat) {
	EventDispatcher.call(this);

	this.tableSeat = tableSeat;

	if (!this.tableSeat.getProtoConnection())
		throw "Cannot buy chips for a non connected seat";
}

FunctionUtil.extend(TableSeatBuyChipsPrompt, EventDispatcher);

TableSeatBuyChipsPrompt.COMPLETE = "complete";
TableSeatBuyChipsPrompt.CANCEL = "cancel";

/**
 * Ask if the user wants to be seated.
 * @method ask
 */
TableSeatBuyChipsPrompt.prototype.ask = function() {
	if (!this.tableSeat.getProtoConnection())
		throw "Cannot buy chips for a non connected seat";

	var params = {
		userId: this.tableSeat.getUser().getId(),
		currency: this.tableSeat.getTable().getCurrency()
	};

	this.tableSeat.getServices().getBackend()
		.call(Backend.GET_USER_BALANCE, params)
		.then(
			this.onGetBalanceCallComplete.bind(this),
			this.onGetBalanceCallError.bind(this)
	);
}

/**
 * Balance call success.
 * @method onGetBalanceCallComplete
 */
TableSeatBuyChipsPrompt.prototype.onGetBalanceCallComplete = function(result) {
	if (!this.tableSeat.getProtoConnection()) {
		console.log("the connection went away while checking balance");
		this.trigger(TableSeatBuyChipsPrompt.CANCEL);
		return;
	}

	var balance = result.balance;
	var d = new ShowDialogMessage();
	d.setText(
		"Welcome to " +
		this.tableSeat.getTable().getName() + ".\n\n" +
		"The minimum required to sit in is " +
		this.tableSeat.getTable().getCurrency() + " " +
		this.tableSeat.getTable().getMinSitInAmount() + ".\n" +
		"The maximum allowed is " +
		this.tableSeat.getTable().getCurrency() + " " +
		this.tableSeat.getTable().getMaxSitInAmount() + ".\n\n" +
		"You currently have " +
		this.tableSeat.getTable().getCurrency() + " " +
		balance + " on your account.\n\n" +
		"How much do you want to bring to the table?"
	);

	d.setDefaultValue(this.tableSeat.getTable().getMinSitInAmount());
	d.addButton(ButtonData.CANCEL);
	d.addButton(ButtonData.SIT_IN);

	this.tableSeat.on(ProtoConnection.CLOSE, this.onConnectionClose, this);
	this.tableSeat.on(ButtonClickMessage.TYPE, this.onButtonClick, this);

	this.tableSeat.send(d);
}

/**
 * Balance call fail.
 * @method onGetBalanceCallError
 */
TableSeatBuyChipsPrompt.prototype.onGetBalanceCallError = function(e) {
	var d = new ShowDialogMessage();

	d.setText("Unable to fetch balance\n\n" + e);
	d.addButton(ButtonData.OK);
	this.tableSeat.send(d);

	this.trigger(TableSeatBuyChipsPrompt.CANCEL);
}

/**
 * Connection close.
 * @method onConnectionClose
 */
TableSeatBuyChipsPrompt.prototype.onConnectionClose = function() {
	console.log("************ connection closed in buy chips prompt");

	this.tableSeat.off(ProtoConnection.CLOSE, this.onConnectionClose, this);
	this.tableSeat.off(ButtonClickMessage.TYPE, this.onButtonClick, this);

	this.trigger(TableSeatBuyChipsPrompt.CANCEL);
}

/**
 * Handle the button click.
 * @method onButtonClick
 * @private
 */
TableSeatBuyChipsPrompt.prototype.onButtonClick = function(e) {
	//console.log("TableSeatBuyChipsPrompt complete");
	//console.log(e);

	if (e.getButton() == ButtonData.SIT_IN) {
		this.chips = e.getValue();

		this.tableSeat.off(ProtoConnection.CLOSE, this.onConnectionClose, this);
		this.tableSeat.off(ButtonClickMessage.TYPE, this.onButtonClick, this);

		var params = {
			userId: this.tableSeat.getUser().getId(),
			tableId: this.tableSeat.getTable().getId(),
			amount: e.getValue()
		};

		this.tableSeat.getServices().getBackend()
			.call(Backend.SIT_IN, params)
			.then(
				this.onSitInCallComplete.bind(this),
				this.onSitInCallError.bind(this)
		);
	}

	if (e.getButton() == ButtonData.CANCEL) {
		this.tableSeat.off(ProtoConnection.CLOSE, this.onConnectionClose, this);
		this.tableSeat.off(ButtonClickMessage.TYPE, this.onButtonClick, this);

		this.trigger(TableSeatBuyChipsPrompt.CANCEL);
	}
}

/**
 * Balance call success.
 * @method onSitInCallComplete
 */
TableSeatBuyChipsPrompt.prototype.onSitInCallComplete = function(r) {
	this.trigger(TableSeatBuyChipsPrompt.COMPLETE);
}

/**
 * Balance call fail.
 * @method onSitInCallError
 */
TableSeatBuyChipsPrompt.prototype.onSitInCallError = function(e) {
	var d = new ShowDialogMessage();
	d.setText("Unable to sit you in at the table.\n\n" + e);
	d.addButton(ButtonData.OK);

	this.tableSeat.send(d);
	this.trigger(TableSeatBuyChipsPrompt.CANCEL);
}

/**
 * Get chips.
 * @method getChips
 */
TableSeatBuyChipsPrompt.prototype.getChips = function() {
	console.log("chips: " + this.chips);

	return parseInt(this.chips);
}

module.exports = TableSeatBuyChipsPrompt;