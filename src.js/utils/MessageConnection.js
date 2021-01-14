let WebSocket;

if (typeof window !== 'undefined' && window.WebSocket)
	WebSocket=window.WebSocket

else
	WebSocket=require("ws");

const EventEmitter=require("events");

class MessageConnection extends EventEmitter {
	constructor(webSocket) {
		super();

		if (!webSocket)
			throw new Error("No websocket for message connection!");

		this.webSocket=webSocket;
		this.webSocket.addEventListener("message",this.onMessage);
		this.webSocket.addEventListener("error",this.onClose);
		this.webSocket.addEventListener("close",this.onClose);
	}

	send(type, message) {
		if (typeof type!="string")
			throw new Error("Message type should be a string");

		if (!this.webSocket)
			throw new Error("Trying to send, but the MessageConnection is closed!");

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

	waitForConnection() {
		if (this.webSocket.readyState==1)
			return Promise.resolve();

		else if (this.webSocket.readyState==2 ||
				this.webSocket.readyState==3)
			return Promise.reject("web socket failed");

		else if (this.webSocket.readyState==0) {
			return new Promise((resolve, reject)=>{
				this.webSocket.onopen=()=>{
					this.webSocket.onopen=null;
					this.webSocket.onerror=null;
					resolve();
				}

				this.webSocket.onerror=(err)=>{
					if (this.webSocket) {
						this.webSocket.onopen=null;
						this.webSocket.onerror=null;
					}
					reject(err);
				}
			});
		}

		else
			throw new Error("unknown ready state");
	}

	close() {
		this.webSocket.removeEventListener("message",this.onMessage);
		this.webSocket.removeEventListener("error",this.onClose);
		this.webSocket.removeEventListener("close",this.onClose);
		this.webSocket.close();
		this.webSocket=null;
	}

	/*static connect(url) {
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
	}*/
}

module.exports=MessageConnection;