const ConnectionManager=require("../connection/ConnectionManager");
const ServerApi=require("./ServerApi");
const ApiProxy=require("../../utils/ApiProxy");
const http=require("http");

class NetPokerServer {
	constructor(options) {
		this.options=options;
		this.apiProxy=new ApiProxy(new ServerApi(this));
	}

	onUserConnection=(userConnection)=>{
		console.log("user connection!!")
	}

	getSettingsError() {
		if (!this.options.port)
			return "Need port!!!";
	}

	async run() {
		if (!this.options.port)
			throw new Error("Need port!");

		this.httpServer=http.createServer(this.apiProxy.handleCall);
		this.httpServer.listen(this.options.port);
		this.connectionManager=new ConnectionManager(this);
		this.connectionManager.on("connection",this.onUserConnection);

		console.log("Server listening to "+this.options.port);
	}
}

module.exports=NetPokerServer;