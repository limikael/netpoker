var Thenable = require("tinp");

function TickLoopRunner() {}

TickLoopRunner.prototype.run = function(requestedTicks) {
	this.requestedTicks = requestedTicks;
	this.currentTicks = 0;

	process.nextTick(this.onTick.bind(this));

	this.thenable = new Thenable();
	return this.thenable;
}

TickLoopRunner.prototype.onTick = function() {
	this.currentTicks++;

	if (this.currentTicks > this.requestedTicks) {
		this.thenable.resolve();
		return;
	}

	process.nextTick(this.onTick.bind(this));
}

TickLoopRunner.runTicks = function(num) {
	if (!num)
		num = 10;

	var tickLoopRunner = new TickLoopRunner();

	return tickLoopRunner.run(num);
}

module.exports = TickLoopRunner;