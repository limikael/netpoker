/**
 * Utilities.
 * @module utils
 */

var Thenable = require("./Thenable");
var inherits = require("inherits");

/**
 * Listen to several promises that all must be fulfilled.
 * @class ThenableBarrier
 */
function ThenableBarrier() {
	Thenable.call(this);

	this.thenables = [];
	this.successCount = 0;

	this.waitAny = false;
	this.done=false;
}

inherits(ThenableBarrier, Thenable);

/**
 * Add a thenable to listen to.
 * @method addThenable
 */
ThenableBarrier.prototype.addThenable = function(t) {
	if (this.handlersCalled)
		throw new Error("Already fired");

	this.thenables.push(t);

	t.then(
		this.onThenableSuccess.bind(this),
		this.onThenableError.bind(this)
	);
}

/**
 * A thenable notified success.
 * @method onThenableSuccess
 * @private
 */
ThenableBarrier.prototype.onThenableSuccess = function() {
	if (this.waitAny) {
		if (!this.done)
			this.notifySuccess();
		this.done = true;
		return;
	}

	this.successCount++;

	//console.log("success, count="+this.successCount+" t="+this.thenables.length);

	if (this.successCount == this.thenables.length) {
		//console.log("notifying success");
		this.notifySuccess();
	}
}

/**
 * A thenable notified error.
 * @method onThenableError
 * @private
 */
ThenableBarrier.prototype.onThenableError = function(e) {
	if (!this.handlersCalled)
		this.notifyError(e);
}

/**
 * Create a thenable barrier
 * @method wait
 * @static
 */
ThenableBarrier.wait = function( /* thenables */ ) {
	var t = new ThenableBarrier();

	for (var i = 0; i < arguments.length; i++)
		t.addThenable(arguments[i]);

	return t;
}

/**
 * Create a thenable barrier
 * @method waitAny
 * @static
 */
ThenableBarrier.waitAny = function( /* thenables */ ) {
	var t = new ThenableBarrier();

	t.waitAny = true;

	for (var i = 0; i < arguments.length; i++)
		t.addThenable(arguments[i]);

	return t;
}

module.exports = ThenableBarrier;