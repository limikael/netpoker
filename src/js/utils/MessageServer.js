var WebSocket = require("faye-websocket");
var http = require("http");
var FunctionUtil = require("./FunctionUtil");
var EventDispatcher = require("./EventDispatcher");
var MessageServerConnection = require("./MessageServerConnection");
var url = require("url");
var querystring = require("querystring");

/**
 * Server that manages connections where each message is a JSON document.
 * @class MessageServer
 */
function MessageServer() {
	EventDispatcher.call(this);

	this.server = http.createServer();

	this.server.on("upgrade", this.onServerUpgrade.bind(this));
}

FunctionUtil.extend(MessageServer, EventDispatcher);

MessageServer.CONNECTION = "connection";

/**
 * Handle server upgrade messages.
 * @method onServerUpgrade
 * @private
 */
MessageServer.prototype.onServerUpgrade = function(request, socket, body) {
	if (!WebSocket.isWebSocket(request))
		return;

	var urlObject = url.parse(request.url);
	var parameters = querystring.parse(urlObject.query);

	//console.log(parameters);

	var ws = new WebSocket(request, socket, body);
	var connection = new MessageServerConnection(ws, parameters);
	this.trigger({
		type: MessageServer.CONNECTION,
		connection: connection
	});
}

/**
 * Set security options.
 * @method setSecurity
 */
MessageServer.prototype.setSecurity = function(key, cert) {}

/**
 * Start listening for connections.
 * @method listen
 */
MessageServer.prototype.listen = function(port) {
	this.server.listen(port);
}

/**
 * Close.
 * @method close
 */
MessageServer.prototype.close = function() {
	this.server.close();
}

module.exports = MessageServer;