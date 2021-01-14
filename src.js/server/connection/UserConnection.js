const MessageConnection=require("../../utils/MessageConnection");
const EventEmitter=require("events");
const User=require("./User");

class UserConnection extends EventEmitter {
	constructor(server, ws, params) {
		super();

		this.server=server;
		this.connection=new MessageConnection(ws);
		this.params=params;

		this.connection.on("close",this.onConnectionClose);
		this.connection.on("message",this.onConnectionMessage);
	}

	async initialize() {
		console.log("init user token: "+this.params.token);
		let res=await this.server.getBackend().call("getUserInfoByToken",{
			token: this.params.token
		});

		if (res.id && res.name)
			this.user=new User(res);
	}

	getUser() {
		return this.user;
	}

	getParams() {
		return this.params;
	}

	send(message, params) {
		this.connection.send(message,params);
	}

	onConnectionClose=()=>{
		this.connection.off("close",this.onConnectionClose);
		this.connection.off("message",this.onConnectionMessage);
		this.emit("close");
	}

	onConnectionMessage=(params)=>{
		this.emit(params.type,params);
	}
}

module.exports=UserConnection;