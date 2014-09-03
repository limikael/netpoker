var Thenable = require("../../src/js/utils/Thenable");
//var process = require("process");

function TickLoopRunner() {}

TickLoopRunner.prototype.run = function(requestedTicks) {
	this.requestedTicks = requestedTicks;
	this.currentTicks = 0;

	setTimeout(this.onTick.bind(this), 0);

	this.thenable = new Thenable();
	return this.thenable;
}

TickLoopRunner.prototype.onTick = function() {
	this.currentTicks++;

	if (this.currentTicks > this.requestedTicks) {
		this.thenable.notifySuccess();
		return;
	}

	setTimeout(this.onTick.bind(this), 0);
}

TickLoopRunner.runTicks = function(num) {
	if (!num)
		num = 10;

	var tickLoopRunner = new TickLoopRunner();

	return tickLoopRunner.run(num);
}

/*TickLoopRunner.setTimeout = setTimeout;
console.log("TickLoopRunner.... setTimeout=" + setTimeout);*/

module.exports = TickLoopRunner;