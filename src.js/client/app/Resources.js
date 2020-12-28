const THEME=require("./theme.js");

class Resources {
	constructor(spriteSheetUrl) {
		this.spriteSheetUrl=spriteSheetUrl
	}

	createSprite(id) {
		let fn=THEME[id];
		return new PIXI.Sprite(this.sheet.textures[fn]);
	}

	getPoint(id) {
		return new PIXI.Point(THEME[id][0],THEME[id][1]);
	}

	async load() {
		await new Promise((resolve,reject)=>{
			PIXI.Loader.shared.add(this.spriteSheetUrl);
			PIXI.Loader.shared.load(resolve);
		});

		this.sheet=PIXI.Loader.shared.resources[this.spriteSheetUrl];
	}
}

module.exports=Resources;
