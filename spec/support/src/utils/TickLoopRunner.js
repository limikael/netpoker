class TickLoopRunner {
	run(requestedTicks) {
		this.requestedTicks = requestedTicks;
		this.currentTicks = 0;

		let p=new Promise((resolve,reject)=>{
			this.resolve=resolve;
		});

		process.nextTick(this.onTick.bind(this));

		return p;
	}

	onTick=()=>{
		this.currentTicks++;

		if (this.currentTicks > this.requestedTicks) {
			this.resolve();
			return;
		}

		process.nextTick(this.onTick.bind(this));
	}

	static runTicks(num) {
		if (!num)
			num = 10;

		var tickLoopRunner = new TickLoopRunner();

		return tickLoopRunner.run(num);
	}
}

module.exports = TickLoopRunner;