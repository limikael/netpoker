const Resources=require("./Resources");

class NetPokerClient {
	constructor(params) {
		this.params=params;

		this.element=params.element;
		this.pixiApp=new PIXI.Application({
			width: this.element.clientWidth,
			height: this.element.clientHeight
		});

		this.pixiApp.view.style.position="absolute";
		this.pixiApp.view.style.top=0;
		this.pixiApp.view.style.left=0;

		this.element.appendChild(this.pixiApp.view);

		let spriteSheetUrl=
			this.params.resourceBaseUrl+
			"/netpokerclient-spritesheet.json";

		this.resources=new Resources(spriteSheetUrl);
	}

	async run() {
		await this.resources.load();

		let table=this.resources.createSprite("table");
		this.pixiApp.stage.addChild(table);
	}
}

module.exports=NetPokerClient;
