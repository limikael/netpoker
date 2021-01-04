const ConnectionManager=require("../connection/ConnectionManager");
const ServerApi=require("./ServerApi");
const ApiProxy=require("../../utils/ApiProxy");
const MockWebServer=require("../mock/MockWebServer");
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

		let callHandler=this.apiProxy.handleCall;
		if (this.options.mock) {
			console.log("Running in mocked mode!");
			this.mockWebServer=new MockWebServer(this);
			callHandler=this.mockWebServer.handleCall;
		}

		this.httpServer=http.createServer(callHandler);
		this.httpServer.listen(this.options.port);
		this.connectionManager=new ConnectionManager(this);
		this.connectionManager.on("connection",this.onUserConnection);

		console.log("Server listening to "+this.options.port);
	}
}

module.exports=NetPokerServer;