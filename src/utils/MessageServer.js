var WebSocket = require("faye-websocket");
var http = require("http");

/**
 * Server that manages connections where each message is a JSON document.
 * @class MessageServer
 */
function MessageServer() {
	this.server = http.createServer();

	this.server.on("upgrade", this.onServerUpgrade.bind(this));
}

MessageServer.prototype.onServerUpgrade = function(request, socket, body) {
	if (!WebSocket.isWebSocket(request))
		return;

	var ws = new WebSocket(request, socket, body);
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