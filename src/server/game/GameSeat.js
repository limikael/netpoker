var BetMessage = require("../../proto/messages/BetMessage");
var FoldCardsMessage = require("../../proto/messages/FoldCardsMessage");
var ActionMessage = require("../../proto/messages/ActionMessage");
var PocketCardsMessage = require("../../proto/messages/PocketCardsMessage");
var Hand = require("../hand/Hand");
var GameSeatPreset = require("./GameSeatPreset");
var ButtonData = require("../../proto/data/ButtonData");
var PresetButtonClickMessage = require("../../proto/messages/PresetButtonClickMessage");
var PresetButtonsMessage = require("../../proto/messages/PresetButtonsMessage");

/**
 * A seat at a game.
 * @class GameSeat
 * @module server
 */
function GameSeat(game, seatIndex) {
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
GameSeat.prototype.getCurrentPreset = function() {
	return this.currentPreset;
}

/**
 * Get current preset value.
 * @method getCurrentPresetValue
 */
GameSeat.prototype.getCurrentPresetValue = function() {
	return this.currentPresetValue;
}

/**
 * Set current preset.
 * @method setCurrentPreset
 */
GameSeat.prototype.setCurrentPreset = function(buttonId, value) {
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
GameSeat.prototype.isPresetValid = function(buttonId, value) {
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
GameSeat.prototype.createPresets = function() {
	this.presets = [];

	this.presets.push(new GameSeatPreset(ButtonData.FOLD, 0));
	this.presets.push(new GameSeatPreset(ButtonData.CHECK, 1));
	this.presets.push(new GameSeatPreset(ButtonData.CHECK_FOLD, 2));
	this.presets.push(new GameSeatPreset(ButtonData.CALL, 2));
	this.presets.push(new GameSeatPreset(ButtonData.CALL_ANY, 3));
	this.presets.push(new GameSeatPreset(ButtonData.RAISE, 4));
	this.presets.push(new GameSeatPreset(ButtonData.BET, 4));
	this.presets.push(new GameSeatPreset(ButtonData.RAISE_ANY, 5));
}

/**
 * Disable all presets.
 * @method disableAllPresets
 */
GameSeat.prototype.disableAllPresets = function() {
	this.tableSeat.off(PresetButtonClickMessage.TYPE, this.onPresetButtonClick, this);

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
GameSeat.prototype.getPresetByButtonId = function(buttonId) {
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
GameSeat.prototype.enablePreset = function(buttonId, value) {
	this.tableSeat.on(PresetButtonClickMessage.TYPE, this.onPresetButtonClick, this);

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
GameSeat.prototype.onPresetButtonClick = function(m) {
	console.log("preset button click");

	this.setCurrentPreset(m.getButton(), m.getValue());
}

/**
 * Send presets.
 * @method sendPresets
 */
GameSeat.prototype.sendPresets = function() {
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
GameSeat.prototype.getSeatIndex = function() {
	return this.tableSeat.getSeatIndex();
}

/**
 * Get table seat.
 * @method getTableSeat
 */
GameSeat.prototype.getTableSeat = function() {
	return this.tableSeat;
}

/**
 * Send a message to the game seat.
 * @method send
 */
GameSeat.prototype.send = function(m) {
	this.tableSeat.send(m);
}

/**
 * Get game reference.
 * @method getGame
 */
GameSeat.prototype.getGame = function() {
	return this.game;
}

/**
 * Add pocket card.
 * @method addPocketCard
 */
GameSeat.prototype.addPocketCard = function(cardData) {
	this.pocketCards.push(cardData);
}

/**
 * Get pocket cards.
 * @method getPocketCards
 */
GameSeat.prototype.getPocketCards = function() {
	return this.pocketCards;
}

/**
 * Make bet.
 * @method makeBet
 */
GameSeat.prototype.makeBet = function(value) {
	if (value == 0)
		return;

	if (value < 0)
		throw new Error("Trying to make negative bet");

	//console.log("********** making bet");

	this.bet += value;
	this.tableSeat.addChips(-value);

	this.game.send(this.tableSeat.getSeatInfoMessage());
	this.game.send(new BetMessage(this.tableSeat.getSeatIndex(), this.bet));
}

/**
 * Return bet.
 * @method returnBet
 */
GameSeat.prototype.returnBet = function(value) {
	if (value > this.bet)
		throw new Error("Trying to return more than bet");

	this.bet -= value;
	this.tableSeat.addChips(value);

	this.game.send(this.tableSeat.getSeatInfoMessage());
	this.game.send(new BetMessage(this.tableSeat.getSeatIndex(), this.bet));
}

/**
 * Folded?
 * @method isFolded
 */
GameSeat.prototype.isFolded = function() {
	return this.folded;
}

/**
 * Get chips.
 * @method getChips
 */
GameSeat.prototype.getChips = function() {
	return this.tableSeat.getChips();
}

/**
 * Get bet.
 * @method getBet
 */
GameSeat.prototype.getBet = function() {
	return this.bet;
}

/**
 * Bet to pot.
 * @method betToPot
 */
GameSeat.prototype.betToPot = function() {
	this.potContrib += this.bet;
	this.bet = 0;
}

/**
 * Get pot contrib.
 * @method getPotContrib
 */
GameSeat.prototype.getPotContrib = function() {
	return this.potContrib;
}

/**
 * Fold cards.
 * @method fold
 */
GameSeat.prototype.fold = function() {
	this.folded = true;

	this.game.send(new ActionMessage(this.getSeatIndex(), ActionMessage.FOLD));
	this.game.send(new FoldCardsMessage(this.getSeatIndex()));
}

/**
 * Show cards.
 * @method show
 */
GameSeat.prototype.show = function() {
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
GameSeat.prototype.muck = function() {
	this.mucked = true;
	this.game.send(new ActionMessage(this.getSeatIndex(), ActionMessage.MUCK));
	this.game.send(new FoldCardsMessage(this.getSeatIndex()));
}

/**
 * Get hand.
 * @method getHand
 */
GameSeat.prototype.getHand = function() {
	return new Hand(this.game.getCommunityCards().concat(this.pocketCards));
}

/**
 * Is this player showing the cards?
 * @method isShowing
 */
GameSeat.prototype.isShowing = function() {
	return this.showing;
}

/**
 * Does the game seat still have cards?
 * I.e. not folded or mucked.
 * @method hasCards
 */
GameSeat.prototype.hasCards = function() {
	if (this.folded || this.mucked)
		return false;

	return true;
}

/**
 * Get the connection that is currently controlling this
 * GameSeat.
 * @method getProtoConnection
 */
GameSeat.prototype.getProtoConnection = function() {
	return this.tableSeat.getProtoConnection();
}

module.exports = GameSeat;