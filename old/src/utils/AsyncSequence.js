/**
 * Utilities.
 * @module utils
 */

var Thenable = require("tinp");
var inherits = require("inherits");

/**
 * Do async operations after each other
 * @class AsyncSequence
 */
function AsyncSequence(functions) {
	Thenable.call(this);

	this.functions = functions;
	this.functionIndex = 0;
}

inherits(AsyncSequence, Thenable);

/**
 * Run the sequence.
 * @method run
 * @private
 */
AsyncSequence.prototype.run = function() {
	this.next();
}

/**
 * Run next item in the sequence.
 * @method next
 * @private
 */
AsyncSequence.prototype.next = function(p) {
	if (this.functionIndex >= this.functions.length) {
		this.resolve(p);
		return;
	}

	var index = this.functionIndex;
	this.functionIndex++;

	this.functions[index](this.next.bind(this));
}

/**
 * Run a sequence
 * @method run
 * @static
 */
AsyncSequence.run = function( /* items */ ) {
	var funcs = [];

	for (var i = 0; i < arguments.length; i++)
		funcs.push(arguments[i]);

	var sequence = new AsyncSequence(funcs);

	sequence.run();

	return sequence;
}

module.exports = AsyncSequence;