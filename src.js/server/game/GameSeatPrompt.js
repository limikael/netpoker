/**
 * Server.
 * @module server
 */

const EventEmitter=require("events");

/**
 * Game seat prompt.
 *
 * Ask a user about an action in a game, in order to do this the sequence is
 * as follows. First, instanciate this class. Add a number of options using the
 * `addButton` method. Set a default action using the `setDefaultButton` method.
 * After this, call the `ask` mathod, and the corresponding messages will
 * be sent to the user. The instance of this class will then be in a waiting
 * state, and dispatch a `GameSeatPrompt.COMPLETE` message when either the
 * user selects an action, of if the operation times out. After the event
 * that signals completion has been sent, the selected button can be retreived
 * using the `getButton` method, and the value for the action, if any, can
 * be retreived using the `getValue` method.
 *
 * Each `GameSeatPrompt` object is only intended to be used once, i.e. to
 * ask one user about one action.
 *
 * When the `ask` method is called, this instance will be made the current
 * one for the accociated game. Only one GameSeatPrompt can be current
 * at any one time, if there is already a GameSeatPrompt that is current
 * when the `ask` method is called, an exception will be thrown.
 * @class GameSeatPrompt
 */
class GameSeatPrompt extends EventEmitter {
	constructor(gameSeat) {
		super();

		if (!gameSeat)
			throw new Error("gameSeat is null");

		if (!gameSeat.getTableSeat())
			throw new Error("tableSeat is null");

		this.gameSeat = gameSeat;
		this.button = null;
		this.value = null;
		this.responseTime = 30;
		this.timeoutId = null;
		this.defaultButton = null;
		this.started = -1;
		this.settingImplication = {};

		this.buttons=[];
		this.values=[];
		this.sliderIndex=-1;
		this.sliderMax=-1;
	}

	/**
	 * Set response time in seconds.
	 * If not set, default response time is 30 secs.
	 * @method setResponseTime
	 */
	setResponseTime(secs) {
		this.responseTime = secs;
	}

	/**
	 * Add button.
	 * @method addButton
	 * @param {String} buttonId The button id for the action to add.
	 * @param {Number} value The default value for the selected action.
	 */
	addButton = function(buttonId, value) {
		this.buttons.push(buttonId);
		this.values.push(value);
	}

	/**
	 * Set default button. It should be a string!
	 * @method setDefaultButton
	 * @param {String} button The button corresponding to the default action.
	 */
	setDefaultButton(button) {
		if (typeof button != "string")
			throw new Error("String expected for setDefaultButton");

		this.defaultButton = button;
	}

	/**
	 * Get last button index.
	 * @method getLastButtonIndex
	 */
	/*getLastButtonIndex() {
		return this.buttons.length - 1;
	}*/

	/**
	 * Set slider button index and min and max values.
	 * @method setSliderValues
	 * @param {Number} buttonIndex The button index that should be affected by the slider.
	 * @param {Number} max The maximum value accepted by the action.
	 */
	setSliderValues = function(buttonIndex, max) {
		this.sliderIndex = buttonIndex;
		this.sliderMax = max;
	}

	/**
	 * Send question and wait for reply.
	 * @method ask
	 */
	ask() {
		if (!this.defaultButton)
			throw new Error("GameSeatPrompt doesn't have a default button");

		if (this.checkTableSeatSettings()) {
			this.emit("complete");
			return;
		}

		if (this.checkGameSeatPresets()) {
			this.emit("complete");
			return;
		}

		this.gameSeat.getGame().setGameSeatPrompt(this);

		this.started = Math.round(Date.now() / 1000);

		this.gameSeat.getTableSeat().on("buttonClick", this.onButtonClickMessage);
		this.gameSeat.getTableSeat().on("settingsChanged", this.onTableSeatSettingsChanged);
		this.timeoutId=setTimeout(this.onTimeout, this.responseTime * 1000);

		this.gameSeat.send("buttons",this.getButtonsMessage());
		this.gameSeat.getGame().send("timer",this.getCurrentTimerMessage());
	}

	/**
	 * Get currenctly associated proto connection.
	 * @method getProtoConnection
	 */
	getConnection() {
		return this.gameSeat.getTableSeat().getConnection();
	}

	/**
	 * Button click message.
	 * @method onButtonClickMessage
	 * @private
	 */
	onButtonClickMessage=(m)=>{
		if (this.timeoutId) {
			clearTimeout(this.timeoutId);
			this.timeoutId = null;
		}

		this.gameSeat.getTableSeat().off("buttonClick", this.onButtonClickMessage);
		this.gameSeat.getTableSeat().off("settingsChanged", this.onTableSeatSettingsChanged);

		this.button = m.button;
		this.value = m.value;

		this.gameSeat.getGame().send("timer");
		this.gameSeat.getGame().setGameSeatPrompt(null);
		this.emit("complete");
	}

	/**
	 * Get the selected button after completion.
	 * @method getButton
	 */
	getButton() {
		if (!this.button)
			throw new Error("GameSeatPrompt not complete.");

		return this.button;
	}

	/**
	 * Get the selected value after completion.
	 * @method getValue
	 */
	getValue() {
		if (isNaN(this.value))
			return 0;

		return this.value;
	}

	/**
	 * Get associated game seat.
	 * @method getGameSeat
	 */
	getGameSeat() {
		return this.gameSeat;
	}

	/**
	 * Timeout.
	 * @method onTimeout
	 * @private
	 */
	onTimeout=()=>{
		if (!this.timeoutId) {
			console.log("clearTimeout not working?");
			return;
		}

		this.gameSeat.send("buttonsMessage");
		this.gameSeat.getTableSeat().off("buttonClick", this.onButtonClickMessage);
		this.gameSeat.getTableSeat().off("settingsChanged", this.onTableSeatSettingsChanged);

		this.timeoutId = null;

		if (this.defaultButton) {
			this.button = this.defaultButton;

			this.gameSeat.getGame().send("timer");
			this.gameSeat.getGame().setGameSeatPrompt(null);
			this.emit("complete");
		}
	}

	/**
	 * Get a TimerMessage to indicate which game seat we are asking,
	 * and how long time is left.
	 * @method getCurrentTimerMessage
	 */
	getCurrentTimerMessage() {
		var now = Math.round(Date.now() / 1000);

		return {
			seatIndex: this.gameSeat.getSeatIndex(),
			totalTime: this.responseTime,
			timeLeft: this.responseTime - (now - this.started)
		};
	}

	/**
	 * Get buttons message.
	 * @method getButtonsMessage
	 */
	getButtonsMessage() {
		return {
			"buttons": this.buttons,
			"values": this.values,
			"sliderIndex": this.sliderIndex,
			"sliderMax": this.sliderMax
		};
	}

	/**
	 * Hard close.
	 * @method close
	 */
	close() {
		if (this.timeoutId) {
			clearTimeout(this.timeoutId);
			this.timeoutId = null;
		}
	}

	/**
	 * Is the selected button either a raise or bet?
	 * @method isRaiseBet
	 */
	isRaiseBet() {
		if (this.getButton() == "raise" || this.getButton() == "bet")
			return true;

		else
			return false;
	}

	/**
	 * Is the selected button either a check or a call?
	 * @method isCheckCall
	 */
	isCheckCall() {
		if (this.getButton() == "check" || this.getButton() == "call")
			return true;

		else
			return false;
	}

	/**
	 * Use a table seat setting to mean a click on the specified button.
	 * @method useTableSeatSetting
	 */
	useTableSeatSetting(settingId, meansButton) {
		this.settingImplication[settingId] = meansButton;
	}

	/**
	 * Get button data for corresponding button id.
	 * @method getButtonDataByButtonId
	 */
	getButtonIndexForButtonId = function(buttonId) {
		for (var i = 0; i < this.buttons.length; i++) {
			if (this.buttons[i] == buttonId)
				return i;
		}

		return -1;
	}

	/**
	 * Check applicable table seat settings and update result
	 * accordingly. Returns true if any setting was applied, false otherwise.
	 * @method checkTableSeatSettings
	 * @private
	 */
	checkTableSeatSettings() {
		for (var settingId in this.settingImplication) {
			if (this.gameSeat.getTableSeat().getSetting(settingId)) {
				var buttonId = this.settingImplication[settingId];
				let buttonIndex = this.getButtonIndexForButtonId(buttonId);

				if (buttonIndex>=0) {
					this.button = this.buttons[buttonIndex];
					this.value = this.values[buttonIndex];
					return true;
				}
			}
		}

		return false;
	}

	/**
	 * Settings changed for the table seat. Check if they are interesting to us,
	 * in that case signal completion.
	 * @method onTableSeatSettingsChanged
	 * @private
	 */
	onTableSeatSettingsChanged=()=>{
		if (this.checkTableSeatSettings()) {
			if (this.timeoutId) {
				clearTimeout(this.timeoutId);
				this.timeoutId = null;
			}

			this.gameSeat.getTableSeat().off("buttonClick", this.onButtonClickMessage);
			this.gameSeat.getTableSeat().off("settingsChanged", this.onTableSeatSettingsChanged);

			this.gameSeat.getGame().send("timer");
			this.gameSeat.getGame().setGameSeatPrompt(null);
			this.gameSeat.send("buttons");
			this.emit("complete");
		}
	}

	/**
	 * Check applicable game seat presets.
	 * @method
	 */
	checkGameSeatPresets() {
		var presetButton = this.gameSeat.getCurrentPreset();

		if (presetButton == "callAny")
			presetButton = "call";

		if (presetButton == "chackFold")
			presetButton = "check";

		var buttonIndex = this.getButtonIndexForButtonId(presetButton);
		if (buttonIndex>=0) {
			this.button = this.buttons[buttonIndex];
			this.value = this.values[buttonIndex];
			return true;
		}

		return false;
	}
}

module.exports = GameSeatPrompt;