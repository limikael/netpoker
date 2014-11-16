var FunctionUtil = require("../../../src/utils/FunctionUtil");
var PixiApp = require("../../../src/utils/PixiApp");
var NineSlice = require("../../../src/utils/NineSlice");
var PIXI = require("pixi.js");

function NineSliceTest() {
	PixiApp.call(this, 800, 600);

	var assets = [
		"../components.png"
	];

	this.assetLoader = new PIXI.AssetLoader(assets);
	this.assetLoader.addEventListener("onComplete", this.onAssetLoaderComplete.bind(this));
	this.assetLoader.load();
}

inherits(NineSliceTest, PixiApp);

NineSliceTest.prototype.onAssetLoaderComplete = function() {
	console.log("loaded");

	var frame = {
		x: 301,
		y: 262,
		width: 74,
		height: 76
	};

	var componentsTexture = PIXI.Texture.fromImage("../components.png");
	var texture = new PIXI.Texture(componentsTexture, frame);

	var s = new NineSlice(texture, 10);
	this.addChild(s);

	s.setLocalSize(300,50);
}

new NineSliceTest();