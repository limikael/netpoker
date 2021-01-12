const ConnectionManager=require("../connection/ConnectionManager");
const CashGameManager=require("../cashgame/CashGameManager");
const ServerApi=require("./ServerApi");
const ApiProxy=require("../../utils/ApiProxy");
const MockWebServer=require("../mock/MockWebServer");
const MockBackend=require("../mock/MockBackend");
const http=require("http");
const Backend=require("./Backend");

class NetPokerServer {
	constructor(options) {
		this.options=options;
		this.apiProxy=new ApiProxy(new ServerApi(this));
	}

	onUserConnection=(userConnection)=>{
		console.log("user connection: "+userConnection.getUser().getName());

		let p=userConnection.getParams();
		if (p.tableId) {
			let table=this.cashGameManager.getTableById(p.tableId);
			if (!table) {
				console.log("table not found, refusing user conection");
				userConnection.close();
			}

			table.notifyNewConnection(userConnection);
		}

		else {
			console.log("No tableId in connection");
		}
	}

	getSettingsError() {
		if (!this.options.port)
			return "Need port!!!";

		if (!this.options.backend && !this.options.mock)
			return "Need backend or mock!";
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

		else if (!this.options.backend) {
			throw new Error("Need backend!");
		}

		this.backend=new Backend(this.options.backend);

		this.cashGameManager=new CashGameManager(this);
		await this.cashGameManager.initialize();

		this.httpServer=http.createServer(callHandler);
		this.httpServer.listen(this.options.port);
		this.connectionManager=new ConnectionManager(this);
		this.connectionManager.on("connection",this.onUserConnection);

		console.log("Server listening to "+this.options.port);
	}

	close() {
		this.httpServer.close();
	}
}

module.exports=NetPokerServer;