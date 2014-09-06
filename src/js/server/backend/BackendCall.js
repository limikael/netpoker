var Thenable = require("../../utils/Thenable");
var request = require("request");

/**
 * A call to a backend.
 */
function BackendCall(url, params) {
	this.url = url;
	this.params = params;

	if (!this.params)
		this.params = {};

	this.thenable = new Thenable();
}

/**
 * Perform.
 */
BackendCall.prototype.perform = function() {
	var components = [];

	for (var k in this.params)
		components.push(k + "=" + encodeURIComponent(this.params[k]));

	var url = this.url + "?" + components.join("&");

	console.log("Backend request: " + url);

	request.get(url, this.onRequestComplete.bind(this));
	return this.thenable;
}

/**
 * Request complete.
 */
BackendCall.prototype.onRequestComplete = function(e, r, body) {
	if (e) {
		this.thenable.reject(e);
		return;
	}

	console.log("backend call returned: " + body);

	var data;

	try {
		data=JSON.parse(body)
		this.thenable.resolve(data);
	}

	catch (e) {
		this.thenable.reject(e);
	}
}

module.exports = BackendCall;