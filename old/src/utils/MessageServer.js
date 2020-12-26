/**
 * Utilities.
 * @module utils
 */

var WebSocket = require("faye-websocket");
var http = require("http");
var https = require("https");
var EventDispatcher = require("yaed");
var MessageServerConnection = require("./MessageServerConnection");
var url = require("url");
var querystring = require("querystring");
var inherits = require("inherits");

/**
 * Server that manages connections where each message is a JSON document.
 * This class also serves as a web server, and there are two different
 * events that are dispatched depending on if the request is a web request
 * or a web socket request.
 * @class MessageServer
 */
function MessageServer() {
	EventDispatcher.call(this);

	this.server = null;
	this.sslOptions = null;
}

inherits(MessageServer, EventDispatcher);

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
	this.trigger({
		type: MessageServer.REQUEST,
		request: request,
		response: response
	});
}

/**
 * Set ssl options.
 * @method setSslOptions
 */
MessageServer.prototype.setSslOptions = function(options) {
	if (!options.hasOwnProperty("key"))
		throw new Error("Expected security options to have a key");

	if (!options.hasOwnProperty("cert"))
		throw new Error("Expected security options to have a cert");

	if (!options.hasOwnProperty("ca"))
		throw new Error("Expected security options to have a ca array");

	this.sslOptions = options;
}

/**
 * Start listening for connections.
 * @method listen
 */
MessageServer.prototype.listen = function(port, bindAddr) {
	if (this.server)
		throw new Error("server already started");

	console.log("Starting message server, port=" + port + ", bound to " + bindAddr);

	if (this.sslOptions) {
		console.log("starting secure server");
		this.server = https.createServer(this.sslOptions);
	} else {
		console.log("starting plaintext server");
		this.server = http.createServer();
	}

	this.server.on("upgrade", this.onServerUpgrade.bind(this));
	this.server.on("request", this.onServerRequest.bind(this));

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