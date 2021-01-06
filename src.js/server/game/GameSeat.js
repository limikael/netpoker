/**
 * Server.
 * @module server
 */

const Hand = require("./Hand");
const GameSeatPreset = require("./GameSeatPreset");

/**
 * A seat at a game.
 * @class GameSeat
 * @module server
 */
class GameSeat {
	constructor(game, seatIndex) {
		this.game = game;
		this.tableSeat = game.getTable().getTableSeatBySeatIndex(seatIndex);
		if (!this.tableSeat)
			throw new Error("Didn't find table seat for index: " + seatIndex);

		this.pocketCards = [];
		this.bet = 0;
		this.potContrib = 0;

		this.folded = false;
		this.showing = false;
		this.mucked = false;

		this.currentPreset = null;
		this.currentPresetValue = null;

		this.createPresets();
	}

	/**
	 * Get current preset.
	 * @method getCurrentPreset
	 */
	getCurrentPreset() {
		return this.currentPreset;
	}

	/**
	 * Get current preset value.
	 * @method getCurrentPresetValue
	 */
	getCurrentPresetValue() {
		return this.currentPresetValue;
	}

	/**
	 * Set current preset.
	 * @method setCurrentPreset
	 */
	setCurrentPreset(buttonId, value) {
		var preset = this.getPresetByButtonId(buttonId);

		if (preset && preset.isEnabled() && preset.checkValueMatch(value)) {
			this.currentPreset = buttonId;
			this.currentPresetValue = value;
		} else {
			this.currentPreset = null;
			this.currentPresetValue = null;
		}
	}

	/**
	 * Is tihs preset valid.
	 * @method isPresetValid
	 */
	isPresetValid(buttonId, value) {
		var preset = this.getPresetByButtonId(buttonId);

		if (preset && preset.isEnabled() && preset.checkValueMatch(value))
			return true;

		else
			return false;
	}

	/**
	 * Create presets.
	 * @method createPresets
	 * @private
	 */
	createPresets() {
		this.presets = [];

		this.presets.push(new GameSeatPreset("fold", 0));
		this.presets.push(new GameSeatPreset("check", 1));
		this.presets.push(new GameSeatPreset("checkFold", 2));
		this.presets.push(new GameSeatPreset("call", 2));
		this.presets.push(new GameSeatPreset("callAny", 3));
		this.presets.push(new GameSeatPreset("raise", 4));
		this.presets.push(new GameSeatPreset("bet", 4));
		this.presets.push(new GameSeatPreset("raiseAny", 5));
	}

	/**
	 * Disable all presets.
	 * @method disableAllPresets
	 */
	disableAllPresets() {
		this.tableSeat.off("presetButtonClick", this.onPresetButtonClick, this);

		for (var p = 0; p < this.presets.length; p++)
			this.presets[p].setEnabled(false);

		this.currentPreset = null;
		this.currentPresetValue = null;
	}

	/**
	 * Get preset by button id.
	 * @method getPresetByButtonId
	 * @private
	 */
	getPresetByButtonId(buttonId) {
		for (var p = 0; p < this.presets.length; p++)
			if (this.presets[p].getButtonId() == buttonId)
				return this.presets[p];

		return null;
	}

	/**
	 * Enable game seat preset.
	 * If the enabled preset is the current one, and if it is enabled with
	 * another value than the current value, we remove the current preset.
	 * @method enablePreset
	 */
	enablePreset(buttonId, value) {
		this.tableSeat.on("presetButtonClick", this.onPresetButtonClick);

		if (!value)
			value = 0;

		var preset = this.getPresetByButtonId(buttonId);

		preset.setEnabled(true);
		preset.setValue(value);

		if (preset.getButtonId() == this.currentPreset &&
			!preset.checkValueMatch(this.currentPresetValue)) {
			this.currentPreset = null;
			this.currentPresetValue = 0;
		}
	}

	/**
	 * Preset button click.
	 * @method onPresetButtonClick
	 * @private
	 */
	onPresetButtonClick=(m)=> {
		this.setCurrentPreset(m.button, m.value);
	}

	/**
	 * Send presets.
	 * @method sendPresets
	 */
	sendPresets() {
		var m = new PresetButtonsMessage();

		for (var p = 0; p < this.presets.length; p++) {
			var preset = this.presets[p];
			if (preset.isEnabled())
				m.setButtonDataAt(preset.getButtonIndex(), preset.getButtonData());
		}

		m.current = this.currentPreset;

		this.send(m);
	}

	/**
	 * Get seat index.
	 * @method getSeatIndex
	 */
	getSeatIndex() {
		return this.tableSeat.getSeatIndex();
	}

	/**
	 * Get table seat.
	 * @method getTableSeat
	 */
	getTableSeat() {
		return this.tableSeat;
	}

	/**
	 * Send a message to the game seat.
	 * @method send
	 */
	send(message, params) {
		this.tableSeat.send(message, params);
	}

	/**
	 * Get game reference.
	 * @method getGame
	 */
	getGame() {
		return this.game;
	}

	/**
	 * Add pocket card.
	 * @method addPocketCard
	 */
	addPocketCard(cardData) {
		this.pocketCards.push(cardData);
	}

	/**
	 * Get pocket cards.
	 * @method getPocketCards
	 */
	getPocketCards() {
		return this.pocketCards;
	}

	/**
	 * Make bet.
	 * @method makeBet
	 */
	makeBet(value) {
		if (value == 0)
			return;

		if (value < 0)
			throw new Error("Trying to make negative bet");

		if (isNaN(value))
			throw new Error("Trying to make NaN bet");

		//console.log("********** making bet");

		if (value > this.tableSeat.getChips())
			throw new Error("trying to bet too much!");

		this.bet += value;
		this.tableSeat.addChips(-value);

		this.game.send("seatInfo",this.tableSeat.getSeatInfoMessage());
		this.game.send("bet",{
			seatIndex: this.tableSeat.getSeatIndex(),
			value: this.bet
		});
	}

	/**
	 * Return bet.
	 * @method returnBet
	 */
	returnBet(value) {
		if (value > this.bet)
			throw new Error("Trying to return more than bet");

		this.bet -= value;
		this.tableSeat.addChips(value);

		this.game.send("seatInfo",this.tableSeat.getSeatInfoMessage());
		this.game.send("bet",{
			seatIndex: this.tableSeat.getSeatIndex(),
			value: this.bet
		});
	}

	/**
	 * Folded?
	 * @method isFolded
	 */
	isFolded() {
		return this.folded;
	}

	/**
	 * Get chips.
	 * @method getChips
	 */
	getChips() {
		return this.tableSeat.getChips();
	}

	/**
	 * Get bet.
	 * @method getBet
	 */
	getBet() {
		return this.bet;
	}

	/**
	 * Bet to pot.
	 * @method betToPot
	 */
	betToPot() {
		if (isNaN(this.bet))
			throw new Error("bet is nan");

		this.potContrib += this.bet;
		this.bet = 0;
	}

	/**
	 * Get pot contrib.
	 * @method getPotContrib
	 */
	getPotContrib() {
		return this.potContrib;
	}

	/**
	 * Fold cards.
	 * @method fold
	 */
	fold() {
		this.folded = true;

		this.game.send(new ActionMessage(this.getSeatIndex(), ActionMessage.FOLD));
		this.game.send(new FoldCardsMessage(this.getSeatIndex()));
	}

	/**
	 * Show cards.
	 * @method show
	 */
	show() {
		this.showing = true;

		var p = new PocketCardsMessage(this.getSeatIndex());
		for (var i = 0; i < this.pocketCards.length; i++)
			p.addCard(this.pocketCards[i]);

		this.game.send(p);

		if (this.game.getCommunityCards().length == 5)
			this.game.getTable().chat(null,
				this.tableSeat.getUser().getName() + " shows " +
				this.getHand().getScoreString());
	}

	/**
	 * Muck cards.
	 * @method muck
	 */
	muck() {
		this.mucked = true;
		this.game.send(new ActionMessage(this.getSeatIndex(), ActionMessage.MUCK));
		this.game.send(new FoldCardsMessage(this.getSeatIndex()));
	}

	/**
	 * Get hand.
	 * @method getHand
	 */
	getHand() {
		return new Hand(this.game.getCommunityCards().concat(this.pocketCards));
	}

	/**
	 * Is this player showing the cards?
	 * @method isShowing
	 */
	isShowing() {
		return this.showing;
	}

	/**
	 * Does the game seat still have cards?
	 * I.e. not folded or mucked.
	 * @method hasCards
	 */
	hasCards() {
		if (this.folded || this.mucked)
			return false;

		return true;
	}

	/**
	 * Get the connection that is currently controlling this
	 * GameSeat.
	 * @method getProtoConnection
	 */
	getConnection = function() {
		return this.tableSeat.getConnection();
	}
}

module.exports = GameSeat;