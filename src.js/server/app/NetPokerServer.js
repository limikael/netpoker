const ConnectionManager=require("../connection/ConnectionManager");
const http=require("http");

class NetPokerServer {
	constructor(options) {
		this.options=options;
	}

	onUserConnection=(userConnection)=>{
		console.log("user connection!!")
	}

	async run() {
		if (!this.options.port)
			throw new Error("Need port!");

		this.httpServer=http.createServer();
		this.httpServer.listen(this.options.port);
		this.connectionManager=new ConnectionManager(this);
		this.connectionManager.on("connection",this.onUserConnection);

		console.log("Server listening to "+this.options.port);
	}
}

module.exports=NetPokerServer;