const ws=require("ws");

class ConnectionManager {
	constructor(server) {
		this.server=server;
		this.wsServer=new WebSocket.Server({server: this.server.httpServer});
		this.wsServer.on("connection",this.onWsConnection);
	}

	onWsConnection=async(ws, req)=>{
		let userConnection=new UserConnection(ws,req);

		await userConnection.initialize();
		this.emit("connection",userConnection);
	}
}

module.exports=ConnectionManager;
