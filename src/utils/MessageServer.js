/**
 * Utilities.
 * @module utils
 */

var WebSocket = require("faye-websocket");
var http = require("http");
var FunctionUtil = require("./FunctionUtil");
var EventDispatcher = require("yaed");
var MessageServerConnection = require("./MessageServerConnection");
var url = require("url");
var querystring = require("querystring");

/**
 * Server that manages connections where each message is a JSON document.
 * This class also serves as a web server, and there are two different
 * events that are dispatched depending on if the request is a web request
 * or a web socket request.
 * @class MessageServer
 */
function MessageServer() {
	EventDispatcher.call(this);

	this.server = http.createServer();

	this.server.on("upgrade", this.onServerUpgrade.bind(this));
	this.server.on("request", this.onServerRequest.bind(this));
}

FunctionUtil.extend(MessageServer, EventDispatcher);

MessageServer.CONNECTION = "connection";
MessageServer.REQUEST = "request";

/**
 * Handle server upgrade messages.
 * @method onServerUpgrade
 * @private
 */
MessageServer.prototype.onServerUpgrade = function(request, socket, body) {
	if (!WebSocket.isWebSocket(request))
		return;

	//	console.log("webserver protocol upgrade");

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
 * Server request.
 * @method onServerRequest
 * @private
 */
MessageServer.prototype.onServerRequest = function(request, response) {
	console.log("server request...");

	this.trigger({
		type: MessageServer.REQUEST,
		request: request,
		response: response
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
MessageServer.prototype.listen = function(port, bindAddr) {
	console.log("Starting message server, port=" + port + ", bound to " + bindAddr);

	this.server.listen(port, bindAddr);
}

/**
 * Close.
 * @method close
 */
MessageServer.prototype.close = function() {
	this.server.close();
}

module.exports = MessageServer;