class MessageConnection {
	constructor(webSocket) {
		this.webSocket=webSocket;
	}

	send(type, message) {
		message._=type;
		this.webSocket.send(JSON.stringify(message));
	}


}