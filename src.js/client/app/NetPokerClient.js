const Resources=require("./Resources");
const NetPokerClientView=require("../view/NetPokerClientView");
const NetPokerClientController=require("../controller/NetPokerClientController");
const MessageConnection=require("../../utils/MessageConnection");
const PixiApp=require("../../utils/PixiApp");
const PromiseUtil=require("../../utils/PromiseUtil");
const TRANSLATIONS=require("./translations");

class NetPokerClient extends PixiApp {
	constructor(params) {
		super(960,720);
		this.params=params;
	}

	async run() {
		// Attach to element.
		this.attach(this.params.element);

		// Load resources.
		let spriteSheetUrl=
			this.params.resourceBaseUrl+
			"/netpokerclient-spritesheet.json";

		this.resources=new Resources(spriteSheetUrl);
		await this.resources.load();

		// Create view and controller.
		this.clientView=new NetPokerClientView(this);
		this.addChild(this.clientView);
		this.clientController=new NetPokerClientController(this.clientView);

		// Connect!
		this.connect();
	}

	async connect() {
		try {
			let ws=new WebSocket(this.params.serverUrl);
			this.connection=new MessageConnection(ws);
			await this.connection.waitForConnection();
			this.connection.on("close",this.waitAndReconnect);
			this.clientController.setConnection(this.connection);
		}

		catch(e) {
			this.connection=null;
			this.waitAndReconnect();
		}
	}

	waitAndReconnect=async ()=> {
		if (this.connection) {
			this.connection.removeListener("close",this.waitAndReconnect);
		}

		this.connection=null;
		this.clientController.setConnection(this.connection);

		await PromiseUtil.delay(5000);
		await this.connect();
	}

	getResources() {
		return this.resources;
	}

	translate(key) {
		if (!TRANSLATIONS[key])
			throw new Error("Unknown ranslation key: "+key);

		return TRANSLATIONS[key];
	}
}

module.exports=NetPokerClient;
