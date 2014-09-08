var EventDispatcher = require("./EventDispatcher");
var FunctionUtil = require("./FunctionUtil");
var Thenable = require("./Thenable");
var request = require("request");

/**
 * A "connection" that loads its messages from a json file rather than
 * actually connecting.
 * @class MessageRequestConnection
 */
function MessageRequestConnection() {
	EventDispatcher.call(this);
	this.test = 1;
}

FunctionUtil.extend(MessageRequestConnection, EventDispatcher);

MessageRequestConnection.CONNECT = "connect";
MessageRequestConnection.MESSAGE = "message";
MessageRequestConnection.CLOSE = "close";

/**
 * Connect.
 * @method connect
 */
MessageRequestConnection.prototype.connect = function(url) {
	request.get(url, this.onRequestComplete.bind(this));
}

/**
 * @method onRequestComplete
 * @private
 */
MessageRequestConnection.prototype.onRequestComplete=function(e, r, body) {
	if (e) {
		this.trigger(MessageRequestConnection.CLOSE);
		return;
	}

	//console.log("MessageRequestConnection: loaded");
	this.trigger(MessageRequestConnection.CONNECT);

	var lines = body.toString().split("\n");

	//console.log("MessageRequestConnection: lines="+lines.length);

	for (var i = 0; i < lines.length; i++) {
		var line = lines[i];

		//console.log("line: "+line);

		if (line.length && line[0] != "/") {
			//console.log("trigger message");
			this.trigger({
				type: MessageRequestConnection.MESSAGE,
				message: JSON.parse(line)
			});
		}
	}
}

/**
 * Send.
 * @method send
 */
MessageRequestConnection.prototype.send = function(m) {
	console.log('ignoring "send" for MessageRequestConnection');
}

module.exports = MessageRequestConnection;