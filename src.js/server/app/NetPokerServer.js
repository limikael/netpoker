const http=require("http");

class NetPokerServer {
	constructor(options) {
		this.options=options;
	}

	onUserConnection=(userConnection)=>{
		console.log("user connection!!")
	}

	async run() {
		this.httpServer=http.createServer();
		this.connectionManager=new ConnectionManager(this);
		this.connectionManager.on("connection",this.onUserConnection);
	}
}

module.exports=options;