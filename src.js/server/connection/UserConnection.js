const MessageConnection=require("../../utils/MessageConnection");
const User=require("./User");

class UserConnection {
	constructor(server, ws, params) {
		this.server=server;
		this.connection=new MessageConnection(ws);
		this.params=params;
	}

	async initialize() {
		console.log("init user token: "+this.params.token);
		let res=await this.server.getBackend().call("getUserInfoByToken",{
			token: this.params.token
		});

		this.user=new User(res);
	}

	getUser() {
		return this.user;
	}
}

module.exports=UserConnection;