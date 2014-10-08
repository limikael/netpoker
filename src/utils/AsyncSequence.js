var Thenable = require("./Thenable");
var FunctionUtil = require("./FunctionUtil");

function AsyncSequence(functions) {
	Thenable.call(this);

	this.functions = functions;
	this.functionIndex = 0;
}

FunctionUtil.extend(AsyncSequence, Thenable);

AsyncSequence.prototype.run = function() {
	this.next();
}

AsyncSequence.prototype.next = function(p) {
	if (this.functionIndex >= this.functions.length) {
		this.notifySuccess(p);
		return;
	}

	var index = this.functionIndex;
	this.functionIndex++;

	this.functions[index](this.next.bind(this));
}

AsyncSequence.run = function( /* items */ ) {
	var funcs = [];

	for (var i = 0; i < arguments.length; i++)
		funcs.push(arguments[i]);

	var sequence = new AsyncSequence(funcs);

	sequence.run();

	return sequence;
}

module.exports = AsyncSequence;