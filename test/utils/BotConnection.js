var InitMessage = require("../../src/js/proto/messages/InitMessage");
var MessageClientConnection = require("../../src/js/utils/MessageClientConnection");
var ProtoConnection = require("../../src/js/proto/ProtoConnection");
var Thenable = require("../../src/js/utils/Thenable");

function BotConnection(url, token) {
	this.url = url;
	this.token = token;
}

BotConnection.prototype.connectToTable = function(tableId) {
	this.initMessage = new InitMessage(this.token);
	this.initMessage.setTableId(tableId);

	this.connection = new MessageClientConnection();
	this.protoConnection = new ProtoConnection(this.connection);
	this.protoConnection.on(ProtoConnection.MESSAGE, this.onProtoConnectionMessage, this);
	this.connection.connect(this.url).then(
		this.onConnectionConnect.bind(this),
		function() {
			throw "Bot connection failed";
		}
	);
}

BotConnection.prototype.onConnectionConnect = function() {
	this.protoConnection.send(this.initMessage);
}

BotConnection.prototype.waitForMessage = function(messageClass) {
	if (this.waitThenable)
		throw "Already waiting for message";

	this.waitThenable = new Thenable();
	this.waitingForType = messageClass.TYPE;

	return this.waitThenable;
}

BotConnection.prototype.onProtoConnectionMessage = function(e) {
	if (this.waitingForType && e.message.type == this.waitingForType) {
		var thenable = this.waitThenable;

		this.waitingForType = null;
		this.waitThenable = null;

		thenable.notifySuccess(e.message);
	}
}

module.exports = BotConnection;