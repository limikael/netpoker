const EventEmitter=require("events");

class EventQueue extends EventEmitter {
	constructor() {
		super();

		this.queue=[];
		this.superEmit=super.emit;
	}

	enqueue(...event) {
		if (this.waitingForObject) {
			this.queue.push(event);
		}

		else {
			this.superEmit.call(this,...event);
		}
	}

	emit() {
		throw new Error("Don't use emit directly");
	}

	waitFor(o, ev) {
		this.waitingForObject=o;
		this.waitingForEvent=ev;
		this.waitingForObject.on(this.waitingForEvent,this.onWaitEvent);
	}

	onWaitEvent=()=>{
		this.waitingForObject.off(this.waitingForEvent,this.onWaitEvent);
		this.waitingForObject=null;
		this.waitingForEvent=null;

		while (this.queue.length && !this.waitingForObject)
			this.superEmit.call(this,this.queue.shift());
	}

	clear() {
		if (this.waitingForObject) {
			this.waitingForObject.off(this.waitingForEvent,this.onWaitEvent);
			this.waitingForObject=null;
			this.waitingForEvent=null;
		}

		this.queue=[];
	}
}

module.exports=EventQueue;