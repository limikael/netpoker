var http = require("http");
var url = require("url");

/**
 * A server suitable for handling rest style api requests that
 * return JSON data.
 * @class ApiServer
 */
function ApiServer() {
	this.handlers = {};
}

/**
 * Register handler.
 * @method registerHandler
 */
ApiServer.prototype.registerHandler = function(func, handler) {
	this.handlers[func] = handler;
}

/**
 * Handle a method.
 * @method handleMethod
 */
ApiServer.prototype.handleMethod = function(method, parameters) {
	if (this.handlers[method]) {
		return this.handlers[method](parameters);
	}
}

/**
 * Can we handle this method?
 * @method canHandleMethod
 */
ApiServer.prototype.canHandleMethod = function(method) {
	if (this.handlers[method])
		return true;

	return false;
}

/**
 * Can we handle this request?
 * @method canHandleRequest
 */
ApiServer.prototype.canHandleRequest = function(request) {
	return this.canHandleMethod(this.getMethodByRequest(request));
}

/**
 * Map request to api method.
 * @method getMethodByRequest
 * @private
 */
ApiServer.prototype.getMethodByRequest = function(request) {
	var urlParts = url.parse(request.url, true);

	var method = urlParts.pathname;
	method = method.replace("/", "");

	return method;
}

/**
 * Handle a web request.
 * @method handleWebRequest
 */
ApiServer.prototype.handleWebRequest = function(request, response) {
	var method = this.getMethodByRequest(request);
	var urlParts = url.parse(request.url, true);

	if (!this.canHandleMethod(method)) {
		response.statusCode = 404;
		response.write(JSON.stringify("No such method."));
	} else {
		try {
			var result = this.handleMethod(method, urlParts.query);
			response.write(JSON.stringify(result));
		} catch (e) {
			var message;

			if (e instanceof Error)
				message = e.message;

			else
				message = e.toString();

			response.statusCode = 500;
			response.write(JSON.stringify(message));
		}
	}

	response.end();
}

/**
 * Handle request.
 * @method onRequest
 */
ApiServer.prototype.onRequest = function(request, response) {
	this.handleWebRequest(request, response);
}

/**
 * Listen to a port.
 * @method listen
 * @param port The port to listen to.
 */
ApiServer.prototype.listen = function(port) {
	this.server = http.createServer();
	this.server.listen(port);
	this.server.on("request", this.onRequest.bind(this));
}

/**
 * Close the server.
 * @method close
 */
ApiServer.prototype.close = function() {
	if (this.server) {
		this.server.close();
	}
}

module.exports = ApiServer;