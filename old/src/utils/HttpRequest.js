var Thenable = require("tinp");

/**
 * Wraps XMLHttpRequest.
 * @class HttpRequest
 */
function HttpRequest(url) {
	this.url = url;
	this.thenable = null;
	this.resultType = null;
}

/**
 * Set result type.
 * @method setResultType
 */
HttpRequest.prototype.setResultType = function(type) {
	this.resultType = type;
}

/**
 * Set url.
 * @method setUrl
 */
HttpRequest.prototype.setUrl = function(url) {
	this.url = url;
}

/**
 * Send.
 * @method send
 */
HttpRequest.prototype.send = function(url) {
	if (this.thenable)
		throw new Error("Request already sent");

	if (url)
		this.url = url;

	this.thenable = new Thenable();

	this.request = new XMLHttpRequest();
	this.request.open("GET", this.url, true);

	this.request.onload = this.onRequestLoad.bind(this);
	this.request.onerror = this.onRequestError.bind(this);

	this.request.send();

	return this.thenable;
}

/**
 * @method onRequestLoad
 * @private
 */
HttpRequest.prototype.onRequestLoad = function() {
	if (this.request.status != 200) {
		this.thenable.reject(this.request.status);
		this.thenable = null;
		return;
	}

	var result = this.request.responseText;

	switch (this.resultType) {
		case "json":
			try {
				result = JSON.parse(this.request.responseText);
			} catch (e) {
				this.thenable.reject("JSON.parse: "+e);
				return;
			}
			break;
	}

	this.thenable.resolve(result);
}

/**
 * @method onRequestError
 * @private
 */
HttpRequest.prototype.onRequestError = function(e) {
	this.request = null;

	this.thenable.reject(e);
}

module.exports = HttpRequest;