var http = require("http");
var url = require("url");

/**
 * A server suitable for handling rest style api requests that
 * return JSON data.
 * @class ApiServer
 */
function ApiServer() {

}

/**
 * Handle request.
 * @method onRequest
 */
ApiServer.prototype.onRequest = function(request, response) {
	var urlParts = url.parse(request.url, true);

	var method = urlParts.pathname;
	method = method.replace("/", "");

	//var result = this.handleMethod(method, urlParts.query);

	result = {
		"hello": "world"
	};

	if (result)
		response.write(JSON.stringify(result));

	response.end();
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