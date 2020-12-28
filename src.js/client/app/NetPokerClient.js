const Resources=require("./Resources");
const NetPokerClientView=require("../view/NetPokerClientView");
const ContentScaler=require("../../utils/ContentScaler");
const MessageConnection=require("../../utils/MessageConnection");

class NetPokerClient {
	constructor(params) {
		this.params=params;

		this.element=params.element;
		this.pixiApp=new PIXI.Application({
			width: this.element.clientWidth,
			height: this.element.clientHeight
		});

		this.pixiApp.renderer.autoDensity=true;
		this.pixiApp.view.style.position="absolute";
		this.pixiApp.view.style.top=0;
		this.pixiApp.view.style.left=0;

		window.addEventListener("resize",this.onWindowResize);

		this.element.appendChild(this.pixiApp.view);

		let spriteSheetUrl=
			this.params.resourceBaseUrl+
			"/netpokerclient-spritesheet.json";

		this.resources=new Resources(spriteSheetUrl);

		this.stage=new PIXI.Container();

		this.contentScaler=new ContentScaler(this.stage);
		this.contentScaler.setScreenSize(
			this.element.clientWidth,
			this.element.clientHeight
		);

		this.contentScaler.setContentSize(960,720);
		this.pixiApp.stage.addChild(this.contentScaler);
	}

	onWindowResize=()=>{
		this.contentScaler.setScreenSize(
			this.element.clientWidth,
			this.element.clientHeight
		);

		this.pixiApp.renderer.resize(
			this.element.clientWidth,
			this.element.clientHeight
		);
	}

	getResources() {
		return this.resources;
	}

	async run() {
		await this.resources.load();

		this.clientView=new NetPokerClientView(this);
		this.stage.addChild(this.clientView);

		this.connect();
	}

	async connect() {
		this.connection=await MessageConnection.connect(this.params.serverUrl);
	}

	getResources() {
		return this.resources;
	}
}

module.exports=NetPokerClient;
