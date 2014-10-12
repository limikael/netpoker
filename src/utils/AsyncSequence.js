/**
 * Utilities.
 * @module utils
 */

var Thenable = require("./Thenable");
var FunctionUtil = require("./FunctionUtil");

/**
 * Do async operations after each other
 * @class AsyncSequence
 */
function AsyncSequence(functions) {
	Thenable.call(this);

	this.functions = functions;
	this.functionIndex = 0;
}

FunctionUtil.extend(AsyncSequence, Thenable);

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
		this.notifySuccess(p);
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