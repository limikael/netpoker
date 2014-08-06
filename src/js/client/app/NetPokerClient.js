var PIXI = require("pixi");
var FunctionUtil = require("../../utils/FunctionUtil");
var PixiApp = require("../../utils/PixiApp");
var NetPokerClientView = require("../view/NetPokerClientView");

/**
 * Main entry point for client.
 * @class NetPokerClient
 */
function NetPokerClient() {
	PixiApp.call(this, 960, 720);

	var assets = [
		"table.png",
		"components.png"
	];

	this.assetLoader = new PIXI.AssetLoader(assets);
	this.assetLoader.addEventListener("onComplete", this.onAssetLoaderComplete.bind(this));
	this.assetLoader.load();

	/*	var g = new PIXI.Graphics();
	g.beginFill(0x00ff00);
	g.drawCircle(100, 100, 100);
	g.endFill();

	this.addChild(g);*/
}

FunctionUtil.extend(NetPokerClient, PixiApp);

NetPokerClient.prototype.onAssetLoaderComplete = function() {
	console.log("asset loader complete...");

	this.netPokerClientView = new NetPokerClientView();
	this.addChild(this.netPokerClientView);
}

module.exports = NetPokerClient;