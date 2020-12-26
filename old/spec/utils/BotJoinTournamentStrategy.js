var BotStrategy = require("./BotStrategy");
var StateCompleteMessage = require("../../src/proto/messages/StateCompleteMessage");
var SeatClickMessage = require("../../src/proto/messages/SeatClickMessage");
var SeatInfoMessage = require("../../src/proto/messages/SeatInfoMessage");
var TableInfoMessage = require("../../src/proto/messages/TableInfoMessage");
var ShowDialogMessage = require("../../src/proto/messages/ShowDialogMessage");
var ButtonClickMessage = require("../../src/proto/messages/ButtonClickMessage");
var ButtonData = require("../../src/proto/data/ButtonData");
var inherits = require("inherits");

/**
 * Sit in at specified seat, with the specified amount of money.
 * @class BotJoinTournamentStrategy
 */
function BotJoinTournamentStrategy(seatIndex, sitInAmount) {
	BotStrategy.call(this);

	this.seatIndex = seatIndex;
	this.sitInAmount = sitInAmount;
}

inherits(BotJoinTournamentStrategy, BotStrategy);

/**
 * Run the strategy.
 * @method run
 */
BotJoinTournamentStrategy.prototype.run = function() {
	this.botConnection.addMessageHandler(TableInfoMessage, this.onTableInfoMessage, this);
	this.botConnection.addMessageHandler(ShowDialogMessage, this.onShowDialogMessage, this);

	var m = this.botConnection.getLastMessageOfType(TableInfoMessage)

	if (m) {
		console.log("there is a table info message already!!!");
		this.onTableInfoMessage(m);
	}
}

/**
 * Got a state complete message.
 * @method onTableInfoMessage
 * @private
 */
BotJoinTournamentStrategy.prototype.onTableInfoMessage = function(m) {
	if (m.getShowJoinButton()) {
		console.log("got join button");
		this.botConnection.send(new ButtonClickMessage(ButtonData.JOIN_TOURNAMENT));
	}

	if (m.getShowLeaveButton()) {
		console.log("got leave button");
		this.botConnection.removeMessageHandler(TableInfoMessage, this.onTableInfoMessage, this);
		this.botConnection.removeMessageHandler(ShowDialogMessage, this.onShowDialogMessage, this);
		this.notifyComplete();
	}
}

/**
 * Show dialog in strategy.
 * @method onShowDialogMessage
 * @private
 */
BotJoinTournamentStrategy.prototype.onShowDialogMessage = function() {
	console.log("show dialog message in strategy");
	this.botConnection.send(new ButtonClickMessage(ButtonData.OK));
}

module.exports = BotJoinTournamentStrategy;