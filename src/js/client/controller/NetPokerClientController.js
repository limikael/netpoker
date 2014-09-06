var FunctionUtil = require("../../utils/FunctionUtil");
var MessageSequencer = require("./MessageSequencer");
var TableController = require("./TableController");
var ProtoConnection = require("../../proto/ProtoConnection");
var ButtonsView = require("../view/ButtonsView");
var ButtonClickMessage = require("../../proto/messages/ButtonClickMessage");
var SeatClickMessage = require("../../proto/messages/SeatClickMessage");
var NetPokerClientView = require("../view/NetPokerClientView");

/**
 * Main controller
 * @class NetPokerClientController
 */
function NetPokerClientController(view) {
	this.netPokerClientView = view;
	this.protoConnection = null;
	this.messageSequencer = new MessageSequencer();

	this.tableController = new TableController(this.messageSequencer, this.netPokerClientView);

	this.netPokerClientView.getButtonsView().on(ButtonsView.BUTTON_CLICK, this.onButtonClick, this);
	this.netPokerClientView.on(NetPokerClientView.SEAT_CLICK, this.onSeatClick, this);
}

/**
 * Set connection.
 * @method setProtoConnection
 */
NetPokerClientController.prototype.setProtoConnection = function(protoConnection) {
	if (this.protoConnection) {
		this.protoConnection.off(ProtoConnection.MESSAGE, this.onProtoConnectionMessage, this);
	}

	this.protoConnection = protoConnection;

	if (this.protoConnection) {
		this.protoConnection.on(ProtoConnection.MESSAGE, this.onProtoConnectionMessage, this);
	}
}

/**
 * Incoming message.
 * Enqueue for processing.
 * @private
 */
NetPokerClientController.prototype.onProtoConnectionMessage = function(e) {
	this.messageSequencer.enqueue(e.message);
}

/**
 * Button click.
 * @private
 */
NetPokerClientController.prototype.onButtonClick = function(e) {
	if (!this.protoConnection)
		return;

	var m = new ButtonClickMessage(e.button, e.value);
	this.protoConnection.send(m);
}

/**
 * Seat click.
 * @private
 */
NetPokerClientController.prototype.onSeatClick = function(e) {
	var m = new SeatClickMessage(e.seatIndex);
	this.protoConnection.send(m);
}

module.exports = NetPokerClientController;