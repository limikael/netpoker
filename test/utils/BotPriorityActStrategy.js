var BotStrategy = require("./BotStrategy");
var ButtonClickMessage = require("../../src/proto/messages/ButtonClickMessage");
var ButtonsMessage = require("../../src/proto/messages/ButtonsMessage");
var ButtonData = require("../../src/proto/data/ButtonData");
var inherits = require("inherits");

/**
 * Acts with with prederemined actions in a priority,
 * depending on which actions are available.
 * @class BotPriorityActStrategy
 */
function BotPriorityActStrategy(actions) {
	BotStrategy.call(this);

	if (!actions)
		actions = [];

	this.actions = actions;
}

inherits(BotPriorityActStrategy, BotStrategy);

/**
 * Set actions to take.
 * @method setActions
 */
BotPriorityActStrategy.prototype.setActions = function(actions) {
	this.actions = actions;
}

/**
 * Set actions to take.
 * @method setActions
 */
BotPriorityActStrategy.prototype.addAction = function(action) {
	this.actions.push(action);
}

/**
 * Set finish message.
 * @method setFinishMessage
 */
BotPriorityActStrategy.prototype.setFinishMessage = function(finishMessage) {
	this.finishMessage = finishMessage;
}

/**
 * Run the strategy.
 * @method run
 */
BotPriorityActStrategy.prototype.run = function() {
	if (this.finishMessage)
		this.botConnection.addMessageHandler(this.finishMessage, this.onFinishMessage, this);

	this.botConnection.addMessageHandler(ButtonsMessage, this.onButtonsMessage, this);

	if (this.botConnection.getButtons()) {
		this.act();
	}
}

/**
 * Buttons.
 * @method onButtonsMessage
 * @private
 */
BotPriorityActStrategy.prototype.onButtonsMessage = function() {
	this.act();
}

/**
 * Act on the current available buttons.
 * @method act
 */
BotPriorityActStrategy.prototype.act = function() {
	if (!this.botConnection.getButtons().length)
		return;

	for (var i = 0; i < this.actions.length; i++) {
		if (this.botConnection.isActionAvailable(this.actions[i])) {
			this.botConnection.act(this.actions[i]);
			return;
		}
	}

	throw new Error("No configured action available, available: "+this.botConnection.getButtons());
}

/**
 * Finish message.
 * @method onFinishMessage
 */
BotPriorityActStrategy.prototype.onFinishMessage = function() {
	console.log("finishing act strategy...");

	if (this.finishMessage)
		this.botConnection.removeMessageHandler(this.finishMessage, this.onFinishMessage, this);

	this.botConnection.removeMessageHandler(ButtonsMessage, this.onButtonsMessage, this);

	this.notifyComplete();
}

module.exports = BotPriorityActStrategy;