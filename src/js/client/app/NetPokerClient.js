var PIXI = require("pixi.js");
var FunctionUtil = require("../../utils/FunctionUtil");
var PixiApp = require("../../utils/PixiApp");
var NetPokerClientView = require("../view/NetPokerClientView");
var NetPokerClientController = require("../controller/NetPokerClientController");
var MessageWebSocketConnection = require("../../utils/MessageWebSocketConnection");
var ProtoConnection = require("../../proto/ProtoConnection");

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
}

FunctionUtil.extend(NetPokerClient, PixiApp);

NetPokerClient.prototype.onAssetLoaderComplete = function() {
	console.log("asset loader complete...");

	this.netPokerClientView = new NetPokerClientView();
	this.addChild(this.netPokerClientView);

	this.netPokerClientController = new NetPokerClientController(this.netPokerClientView);

	this.connection = new MessageWebSocketConnection();
	this.connection.on(MessageWebSocketConnection.CONNECT, this.onConnectionConnect, this);
	this.connection.connect(NET_POKER_URL);
}

NetPokerClient.prototype.onConnectionConnect = function() {
	console.log("**** connected");
	this.protoConnection = new ProtoConnection(this.connection);
	this.netPokerClientController.setProtoConnection(this.protoConnection);
}

module.exports = NetPokerClient;