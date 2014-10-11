var FunctionUtil = require("../../../src/utils/FunctionUtil");
var PixiApp = require("../../../src/utils/PixiApp");
var Button = require("../../../src/utils/Button");
var PIXI = require("pixi.js");

function ButtonTest() {
	PixiApp.call(this, 800, 600);

	var assets = [
		"../components.png"
	];

	this.assetLoader = new PIXI.AssetLoader(assets);
	this.assetLoader.addEventListener("onComplete", this.onAssetLoaderComplete.bind(this));
	this.assetLoader.load();
}

FunctionUtil.extend(ButtonTest, PixiApp);

ButtonTest.prototype.onAssetLoaderComplete = function() {
	console.log("loaded");

	var frame = {
		x: 33,
		y: 298,
		width: 95,
		height: 94
	};

	var componentsTexture = PIXI.Texture.fromImage("../components.png");
	var texture = new PIXI.Texture(componentsTexture, frame);

	var content = new PIXI.DisplayObjectContainer();
	var s = new PIXI.Sprite(texture);
	content.addChild(s);

	var textfield = new PIXI.Text("hello");
	textfield.position.x = 15;
	textfield.position.y = 30;
	content.addChild(textfield);

	var button = new Button(content);
	button.position.x = 100;
	button.position.y = 100;
	this.addChild(button);

	button.on(Button.CLICK, function() {
		console.log("button clicked...");
	});
}

new ButtonTest();