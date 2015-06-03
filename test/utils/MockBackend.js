var Thenable = require("tinp");

/**
 * MockBackend
 */
function MockBackend() {

}

/**
 * Call
 */
MockBackend.prototype.call = function(method, params) {
	var t = new Thenable();

	t.resolve(this[method](params));

	return t;
}

module.exports = MockBackend;