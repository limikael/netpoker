var FunctionUtil = require("../../utils/FunctionUtil");
var MessageSequencer = require("./MessageSequencer");
var TableController = require("./TableController");
var ProtoConnection = require("../../proto/ProtoConnection");

/**
 * Main controller
 * @class NetPokerClientController
 */
function NetPokerClientController(view) {
	this.netPokerClientView = view;
	this.protoConnection = null;
	this.messageSequencer = new MessageSequencer();

	this.tableController = new TableController(this.messageSequencer, this.netPokerClientView);
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
		//console.log("waiting for message: "+ProtoConnection.MESSAGE);
		this.protoConnection.on(ProtoConnection.MESSAGE, this.onProtoConnectionMessage, this);
	}
}

/**
 * Incoming message.
 * Enqueue for processing.
 * @private
 */
NetPokerClientController.prototype.onProtoConnectionMessage = function(e) {
	//console.log("proto connection message...");
	this.messageSequencer.enqueue(e.message);
}

module.exports = NetPokerClientController;