/**
 * Server.
 * @module server
 */

const CashGameBuyChipsPrompt = require("./CashGameBuyChipsPrompt");
const TableSeatSettings = require("../table/TableSeatSettings");
const BaseTableSeat = require("../table/BaseTableSeat");
const EventEmitter = require("events");

/**
 * A user seated at a table.
 * @class CashGameUser
 * @extends EventDispatcher
 */
class CashGameUser extends EventEmitter {
	constructor(tableSeat, user) {
		super();

		this.tableSeat = tableSeat;
		this.user = user;
		this.sitInCompleted = false;
		this.leaving = false;
		this.chips = 0;
		this.sittingout = false;
		this.settings = new TableSeatSettings();

		this.tableSeat.on("buttonClick", this.onTableSeatButtonClick);
		this.tableSeat.on("settingsChanged", this.onTableSeatSettingsChanged);
	}

	/**
	 * Get seated user.
	 * @method getUser
	 */
	getUser() {
		return this.user;
	}

	/**
	 * Sit in user.
	 * @method sitIn
	 */
	sitIn() {
		if (this.sitInCompleted)
			throw "Already sitting in";

		if (this.buyChipsPrompt)
			throw "Buying";

		this.buyChipsPrompt = new CashGameBuyChipsPrompt(this.tableSeat);
		this.buyChipsPrompt.on("complete", this.onBuyChipsPromptComplete);
		this.buyChipsPrompt.on("cancel", this.onBuyChipsPromptCancel);

		this.tableSeat.getTable().send("seatInfo",this.tableSeat.getSeatInfoMessage());
		this.tableSeat.send("tableInfo",this.getTableInfoMessage());

		this.buyChipsPrompt.ask();

	}

	/**
	 * Buy chips prompt complete.
	 * @method onBuyChipsPromptComplete
	 */
	onBuyChipsPromptComplete=()=>{
		this.buyChipsPrompt.off("complete", this.onBuyChipsPromptComplete);
		this.buyChipsPrompt.off("cancel", this.onBuyChipsPromptCancel);

		this.sitInCompleted = true;
		this.chips = this.buyChipsPrompt.getChips();
		this.getChips();

		this.buyChipsPrompt = null;

		if (this.leaving) {
			this.leave();
		} else {
			this.tableSeat.getTable().send("seatInfo",this.tableSeat.getSeatInfoMessage());
			this.emit("ready");
		}

		this.tableSeat.send("tableInfo",this.getTableInfoMessage());
	}

	/**
	 * Buy chips prompt complete.
	 * @method onBuyChipsPromptCancel
	 */
	onBuyChipsPromptCancel=()=>{
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
	isInGame() {
		return this.sitInCompleted && !this.sittingout && !this.leaving;
	}

	/**
	 * Get chips.
	 * @method getChips
	 */
	getChips() {
		if (isNaN(this.chips))
			throw new Error("chips is NaN");

		//console.log("get chisp: " + this.chips);
		return this.chips;
	}

	/**
	 * Set chips.
	 * @method setChips
	 */
	setChips(value) {
		//console.log("setting chips: " + value);
		this.chips = value;
	}

	/**
	 * Leave.
	 * @method leave
	 */
	leave() {
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

		var backend = this.tableSeat.getTable().getServer().getBackend();
		backend.call("leaveCashGame", params).then(
			this.onSitoutCallComplete.bind(this),
			this.onSitoutCallError.bind(this)
		);
	}

	/**
	 * Sitout call complete.
	 * @method onSitoutCallComplete
	 * @private
	 */
	onSitoutCallComplete=()=>{
		this.cleanupAndNotifyDone();
	}

	/**
	 * Clean up listeners and notify that we are done.
	 * This instance should be considered disposed of after this.
	 * @method cleanupAndNotifyDone
	 * @private
	 */
	cleanupAndNotifyDone() {
		//console.log("********** notifying done in table seat user");

		this.tableSeat.off("buttonClick", this.onTableSeatButtonClick);
		this.tableSeat.off("settingsChanged", this.onTableSeatSettingsChanged);
		this.emit("done");
	}

	/**
	 * Sitout call error.
	 * @method onSitoutCallError
	 * @private
	 */
	onSitoutCallError=()=>{
		console.log("sitout call failed!!!");
		this.emit("done");
	}

	/**
	 * Is this seat currently in reserved mode?
	 * @method isReserved
	 */
	isReserved() {
		if (this.buyChipsPrompt)
			return true;

		else
			return false;
	}

	/**
	 * Is this table seat user sitting out?
	 * @method isSitout
	 */
	isSitout() {
		return this.sittingout;
	}

	/**
	 * Sit out the table seat user.
	 * @method sitout
	 */
	sitout() {
		this.tableSeat.send("buttons",{
			buttons: ["leave","imBack"]
		});

		this.sittingout = true;
		this.settings.set("sitOutNext", true);
		this.tableSeat.send("checkbox",{
			id: "sitOutNext",
			checked: false
		});
		this.tableSeat.send("tableInfo",this.getTableInfoMessage());

		this.tableSeat.getTable().send("seatInfo",this.tableSeat.getSeatInfoMessage());
	}

	/**
	 * Get TableInfoMessage
	 * @method getTableInfoMessage
	 */
	getTableInfoMessage() {
		if (!this.tableSeat.isInGame() || this.buyChipsPrompt)
			return {};

		if (!this.tableSeat.getTable().getCurrentGame())
			return {
				text: "Please wait for another player to join the table."
			};

		var currentGame = this.tableSeat.getTable().getCurrentGame();

		if (!currentGame.isTableSeatInGame(this.tableSeat) && currentGame.isJoinComplete())
			return {
				text: "Please wait for the next hand."
			};

		return {};
	}

	/**
	 * Handle table seat button click.
	 * @method onTableSeatButtonClick
	 * @private
	 */
	onTableSeatButtonClick=(m)=>{
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
	onTableSeatSettingsChanged=()=>{
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
	sitBackIn() {
		if (this.leaving)
			return;

		if (!this.sittingout)
			throw new Error("not sitting out");

		this.sittingout = false;
		this.tableSeat.getTable().send(this.tableSeat.getSeatInfoMessage());
		this.tableSeat.send("tableInfo",this.getTableInfoMessage());

		this.settings.set(CheckboxMessage.SITOUT_NEXT, false);
		this.tableSeat.send(new CheckboxMessage(CheckboxMessage.SITOUT_NEXT, false));

		this.trigger(CashGameUser.READY);
	}

	/**
	 * Get settings.
	 * @method getSettings
	 */
	getSettings() {
		return this.settings;
	}
}

module.exports = CashGameUser;