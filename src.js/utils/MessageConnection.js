let WebSocket;

if (typeof window !== 'undefined' && window.WebSocket)
	WebSocket=window.WebSocket

else
	WebSocket=require("ws");

const EventEmitter=require("events");

class MessageConnection extends EventEmitter {
	constructor(webSocket) {
		super();

		this.webSocket=webSocket;
		this.webSocket.addEventListener("message",this.onMessage);
		this.webSocket.addEventListener("error",this.onClose);
		this.webSocket.addEventListener("close",this.onClose);
	}

	send(type, message) {
		if (typeof type!="string")
			throw new Error("Message type should be a string");

		if (!message)
			message={};

		message.type=type;
		this.webSocket.send(JSON.stringify(message));
	}

	onClose=()=>{
		this.webSocket.removeEventListener("message",this.onMessage);
		this.webSocket.removeEventListener("error",this.onClose);
		this.webSocket.removeEventListener("close",this.onClose);
		this.webSocket=null;
		this.emit("close");
	}

	onMessage=(event)=>{
		let data;

		try {
			data=JSON.parse(event.data);
		}

		catch (e) {
			console.log("Warning! Unable to parse JSON, ignoring message...");
			return;
		}

		if (!data.type) {
			console.log("Warning! No message type, ignoring...");
			return;
		}

		this.emit(data.type,data);
		this.emit("message",data);
	}

	static connect(url) {
		return new Promise((resolve, reject)=>{
			let webSocket=new WebSocket(url);
			webSocket.onopen=()=>{
				resolve(new MessageConnection(webSocket));
			}

			webSocket.onerror=(err)=>{
				//console.log("connection failed...");
				reject(err);
			}
		});
	}
}

module.exports=MessageConnection;