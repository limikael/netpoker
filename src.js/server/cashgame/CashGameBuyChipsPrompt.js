/**
 * Server.
 * @module server
 */

var EventEmitter = require("events");

/**
 * Prompt user to buy chips.
 * @class CashGameBuyChipsPrompt
 */
class CashGameBuyChipsPrompt extends EventEmitter {
	constructor(tableSeat) {
		super();

		this.tableSeat = tableSeat;

		if (!this.tableSeat.getConnection())
			throw "Cannot buy chips for a non connected seat";
	}

	/**
	 * Ask if the user wants to be seated.
	 * @method ask
	 */
	ask() {
		if (!this.tableSeat.getConnection())
			throw "Cannot buy chips for a non connected seat";

		var params = {
			userId: this.tableSeat.getUser().getId(),
			currency: this.tableSeat.getTable().getCurrency()
		};

		this.tableSeat.getServer().getBackend()
			.call("getUserBalance", params)
			.then(
				this.onGetBalanceCallComplete,
				this.onGetBalanceCallError
			);
	}

	/**
	 * Balance call success.
	 * @method onGetBalanceCallComplete
	 */
	onGetBalanceCallComplete=(result)=>{
		if (!this.tableSeat.getConnection()) {
			console.log("the connection went away while checking balance");
			this.emit("cancel");
			return;
		}

		this.tableSeat.on("close", this.onConnectionClose);
		this.tableSeat.on("buttonClick", this.onButtonClick);

		let balance = parseFloat(result.balance);
		let message = {
			text:
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
				"How much do you want to bring to the table?",

			buttons: ["cancel","sitIn"],
			defaultValue: this.tableSeat.getTable().getMinSitInAmount()
		};

		this.tableSeat.send("showDialog",message);
	}

	/**
	 * Balance call fail.
	 * @method onGetBalanceCallError
	 */
	onGetBalanceCallError=(e)=>{
		var d = new ShowDialogMessage();

		d.setText("Unable to fetch balance\n\n" + e);
		d.addButton(ButtonData.OK);
		this.tableSeat.send(d);

		this.emit("cancel");
	}

	/**
	 * Connection close.
	 * @method onConnectionClose
	 */
	onConnectionClose=()=>{
		this.tableSeat.off("close", this.onConnectionClose);
		this.tableSeat.off("buttonClick", this.onButtonClick);
		this.emit("cancel");
	}

	/**
	 * Handle the button click.
	 * @method onButtonClick
	 * @private
	 */
	onButtonClick=(e)=>{
		//console.log("CashGameBuyChipsPrompt complete");
		//console.log(e);

		if (e.button == "sitIn") {
			this.tableSeat.off("close", this.onConnectionClose);
			this.tableSeat.off("buttonClick", this.onButtonClick);

			var chips = parseInt(e.value);
			var amountError = null;

			if (chips < this.tableSeat.getTable().getMinSitInAmount())
				amountError = "Minimum required to sit in is " +
				this.tableSeat.getTable().getCurrency() + " " +
				this.tableSeat.getTable().getMinSitInAmount();

			if (chips > this.tableSeat.getTable().getMaxSitInAmount())
				amountError = "Maximum allowed to sit in with is " +
				this.tableSeat.getTable().getCurrency() + " " +
				this.tableSeat.getTable().getMaxSitInAmount();

			if (amountError) {
				var d = new ShowDialogMessage();
				d.setText(amountError);
				d.addButton(ButtonData.OK);

				this.tableSeat.send(d);
				this.emit(CashGameBuyChipsPrompt.CANCEL);
				return;
			}

			this.chips = chips;

			var params = {
				userId: this.tableSeat.getUser().getId(),
				tableId: this.tableSeat.getTable().getId(),
				amount: this.chip
			};

			this.tableSeat.getServer().getBackend()
				.call("joinCashGame", params)
				.then(
					this.onSitInCallComplete.bind(this),
					this.onSitInCallError.bind(this)
			);
		}

		if (e.button == "cancel") {
			this.tableSeat.off("close", this.onConnectionClose);
			this.tableSeat.off("buttonClick", this.onButtonClick);
			this.emit("cancel")
		}
	}

	/**
	 * Balance call success.
	 * @method onSitInCallComplete
	 */
	onSitInCallComplete=(r)=> {
		//console.log("sit in call complete!");

		this.emit("complete");
	}

	/**
	 * Balance call fail.
	 * @method onSitInCallError
	 */
	onSitInCallError=(e)=> {
		//console.log("sit in call error!");

		this.tableSeat.send("showDialog",{
			text: "Unable to sit you in at the table.\n\n" + e,
			buttons: ["ok"]
		});

		this.emit("cancel");
	}

	/**
	 * Get chips.
	 * @method getChips
	 */
	getChips() {
		//console.log("chips: " + this.chips);

		return parseInt(this.chips);
	}
}

module.exports = CashGameBuyChipsPrompt;