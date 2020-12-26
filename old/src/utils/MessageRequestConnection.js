/**
 * Utilities.
 * @module utils
 */

var Thenable = require("tinp");
var inherits = require("inherits");
var EventDispatcher = require("yaed");
var HttpRequest = require("../utils/HttpRequest");

/**
 * A "connection" that loads its messages from a json file rather than
 * actually connecting.
 * @class MessageRequestConnection
 */
function MessageRequestConnection() {
	EventDispatcher.call(this);
	this.test = 1;
}

inherits(MessageRequestConnection, EventDispatcher);

MessageRequestConnection.CONNECT = "connect";
MessageRequestConnection.MESSAGE = "message";
MessageRequestConnection.CLOSE = "close";

/**
 * Connect.
 * @method connect
 */
MessageRequestConnection.prototype.connect = function(url) {
	var request = new HttpRequest(url);

	request.send().then(
		this.onRequestComplete.bind(this),
		this.onRequestError.bind(this)
	);
}

/**
 * @method onRequestComplete
 * @private
 */
MessageRequestConnection.prototype.onRequestComplete = function(body) {
	this.trigger(MessageRequestConnection.CONNECT);

	var lines = body.toString().split("\n");

	//console.log("MessageRequestConnection: lines="+lines.length);

	for (var i = 0; i < lines.length; i++) {
		var line = lines[i];

		//console.log("line: "+line);

		if (line.length && line[0] != "/") {
			console.log("trigger message: " + line);
			this.trigger({
				type: MessageRequestConnection.MESSAGE,
				message: JSON.parse(line)
			});
		}
	}
}

/**
 * @method onRequestComplete
 * @private
 */
MessageRequestConnection.prototype.onRequestError = function(e) {
	console.log("error in request connection");
	console.log(e);
	this.trigger(MessageRequestConnection.CLOSE);
}

/**
 * Send.
 * @method send
 */
MessageRequestConnection.prototype.send = function(m) {
	console.log('ignoring "send" for MessageRequestConnection');
}

module.exports = MessageRequestConnection;