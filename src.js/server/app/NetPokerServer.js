const ConnectionManager=require("../connection/ConnectionManager");
const CashGameManager=require("../cashgame/CashGameManager");
const ServerApi=require("./ServerApi");
const ApiProxy=require("../../utils/ApiProxy");
const MockWebServer=require("../mock/MockWebServer");
const MockBackend=require("../mock/MockBackend");
const http=require("http");

class NetPokerServer {
	constructor(options) {
		this.options=options;
		this.apiProxy=new ApiProxy(new ServerApi(this));
	}

	onUserConnection=(userConnection)=>{
		console.log("user connection: "+userConnection.getUser().getName());
	}

	getSettingsError() {
		if (!this.options.port)
			return "Need port!!!";
	}

	getBackend() {
		return this.backend;
	}

	async run() {
		if (!this.options.port)
			throw new Error("Need port!");

		let callHandler=this.apiProxy.handleCall;
		if (this.options.mock) {
			console.log("Running in mocked mode!");
			this.mockWebServer=new MockWebServer(this);
			callHandler=this.mockWebServer.handleCall;
			this.backend=new MockBackend(this);
		}

		this.cashGameManager=new CashGameManager(this);
		await this.cashGameManager.initialize();

		this.httpServer=http.createServer(callHandler);
		this.httpServer.listen(this.options.port);
		this.connectionManager=new ConnectionManager(this);
		this.connectionManager.on("connection",this.onUserConnection);

		console.log("Server listening to "+this.options.port);
	}
}

module.exports=NetPokerServer;