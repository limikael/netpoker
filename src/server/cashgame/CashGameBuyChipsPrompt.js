/**
 * Server.
 * @module server
 */

var FunctionUtil = require("../../utils/FunctionUtil");
var EventDispatcher = require("../../utils/EventDispatcher");
var Backend = require("../backend/Backend");
var ShowDialogMessage = require("../../proto/messages/ShowDialogMessage");
var ButtonData = require("../../proto/data/ButtonData");
var ProtoConnection = require("../../proto/ProtoConnection");
var ButtonClickMessage = require("../../proto/messages/ButtonClickMessage");

/**
 * Prompt user to buy chips.
 * @class CashGameBuyChipsPrompt
 */
function CashGameBuyChipsPrompt(tableSeat) {
	EventDispatcher.call(this);

	this.tableSeat = tableSeat;

	if (!this.tableSeat.getProtoConnection())
		throw "Cannot buy chips for a non connected seat";
}

FunctionUtil.extend(CashGameBuyChipsPrompt, EventDispatcher);

CashGameBuyChipsPrompt.COMPLETE = "complete";
CashGameBuyChipsPrompt.CANCEL = "cancel";

/**
 * Ask if the user wants to be seated.
 * @method ask
 */
CashGameBuyChipsPrompt.prototype.ask = function() {
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
CashGameBuyChipsPrompt.prototype.onGetBalanceCallComplete = function(result) {
	if (!this.tableSeat.getProtoConnection()) {
		console.log("the connection went away while checking balance");
		this.trigger(CashGameBuyChipsPrompt.CANCEL);
		return;
	}

	var balance = parseFloat(result.balance);
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
CashGameBuyChipsPrompt.prototype.onGetBalanceCallError = function(e) {
	var d = new ShowDialogMessage();

	d.setText("Unable to fetch balance\n\n" + e);
	d.addButton(ButtonData.OK);
	this.tableSeat.send(d);

	this.trigger(CashGameBuyChipsPrompt.CANCEL);
}

/**
 * Connection close.
 * @method onConnectionClose
 */
CashGameBuyChipsPrompt.prototype.onConnectionClose = function() {
	console.log("************ connection closed in buy chips prompt");

	this.tableSeat.off(ProtoConnection.CLOSE, this.onConnectionClose, this);
	this.tableSeat.off(ButtonClickMessage.TYPE, this.onButtonClick, this);

	this.trigger(CashGameBuyChipsPrompt.CANCEL);
}

/**
 * Handle the button click.
 * @method onButtonClick
 * @private
 */
CashGameBuyChipsPrompt.prototype.onButtonClick = function(e) {
	//console.log("CashGameBuyChipsPrompt complete");
	//console.log(e);

	if (e.getButton() == ButtonData.SIT_IN) {
		this.tableSeat.off(ProtoConnection.CLOSE, this.onConnectionClose, this);
		this.tableSeat.off(ButtonClickMessage.TYPE, this.onButtonClick, this);

		var chips = e.getValue();
		var amountError = null;

		if (chips < this.tableSeat.getTable().getMinSitInAmount())
			amountError = "Minimum required to sit in is " +
			this.tableSeat.getTable().getCurrency() + " " +
			this.tableSeat.getTable().getMinSitInAmount();

		if (chips > this.tableSeat.getTable().getMaxSitInAmount())
			amountError = "Maximum allowed to sit in with is " +
			this.tableSeat.getTable().getCurrency() + " " +
			this.tableSeat.getTable().getMinSitInAmount();

		if (amountError) {
			var d = new ShowDialogMessage();
			d.setText(amountError);
			d.addButton(ButtonData.OK);

			this.tableSeat.send(d);
			this.trigger(CashGameBuyChipsPrompt.CANCEL);
			return;
		}

		this.chips = chips;

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

		this.trigger(CashGameBuyChipsPrompt.CANCEL);
	}
}

/**
 * Balance call success.
 * @method onSitInCallComplete
 */
CashGameBuyChipsPrompt.prototype.onSitInCallComplete = function(r) {
	console.log("sit in call complete!");

	this.trigger(CashGameBuyChipsPrompt.COMPLETE);
}

/**
 * Balance call fail.
 * @method onSitInCallError
 */
CashGameBuyChipsPrompt.prototype.onSitInCallError = function(e) {
	console.log("sit in call error!");

	var d = new ShowDialogMessage();
	d.setText("Unable to sit you in at the table.\n\n" + e);
	d.addButton(ButtonData.OK);

	this.tableSeat.send(d);
	this.trigger(CashGameBuyChipsPrompt.CANCEL);
}

/**
 * Get chips.
 * @method getChips
 */
CashGameBuyChipsPrompt.prototype.getChips = function() {
	console.log("chips: " + this.chips);

	return parseInt(this.chips);
}

module.exports = CashGameBuyChipsPrompt;