/**
 * Server.
 * @module server
 */

var Thenable = require("../../utils/Thenable");
var request = require("request");

/**
 * A call to a backend.
 * @class BackendCall
 */
function BackendCall(url, params) {
	this.url = url;
	this.params = params;

	if (!this.params)
		this.params = {};

	this.thenable = new Thenable();
}

/**
 * Perform the call.
 * @method perform
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
 * @method onRequestComplete
 * @private
 */
BackendCall.prototype.onRequestComplete = function(e, r, body) {
	if (e) {
		this.thenable.reject(e);
		return;
	}

	console.log("backend call returned: " + body);

	if (!body.toString().length) {
		this.thenable.reject("Empty response from server");
		return;
	}

	var data;

	try {
		data = JSON.parse(body)

		if (data.ok) {
			this.thenable.resolve(data);
		} else {
//			this.thenable.reject(data.message);
			this.thenable.resolve(data);
		}

	} catch (e) {
		this.thenable.reject(e.toString() + "\n\nServer response:\n" + body);
	}
}

module.exports = BackendCall;