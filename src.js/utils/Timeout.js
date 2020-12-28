const EventEmitter=require("events");

class Timeout extends EventEmitter {
	constructor(delay) {
		super();
		setTimeout(this.onTimeout,delay);
	}

	onTimeout=()=>{
		this.emit("timeout");
	}
}

module.exports=Timeout;