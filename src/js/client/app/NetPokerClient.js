var PIXI = require("pixi.js");
var FunctionUtil = require("../../utils/FunctionUtil");
var PixiApp = require("../../utils/PixiApp");
var NetPokerClientView = require("../view/NetPokerClientView");
var NetPokerClientController = require("../controller/NetPokerClientController");
var MessageWebSocketConnection = require("../../utils/MessageWebSocketConnection");
var ProtoConnection = require("../../proto/ProtoConnection");
var LoadingScreen = require("../view/LoadingScreen");

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

	this.loadingScreen = new LoadingScreen();
	this.addChild(this.loadingScreen);
	this.loadingScreen.show("LOADING");

	this.assetLoader = new PIXI.AssetLoader(assets);
	this.assetLoader.addEventListener("onComplete", this.onAssetLoaderComplete.bind(this));
	this.assetLoader.load();
}

FunctionUtil.extend(NetPokerClient, PixiApp);

/**
 * Assets loaded, connect.
 */
NetPokerClient.prototype.onAssetLoaderComplete = function() {
	console.log("asset loader complete...");

	this.netPokerClientView = new NetPokerClientView();
	this.addChildAt(this.netPokerClientView, 0);

	this.netPokerClientController = new NetPokerClientController(this.netPokerClientView);
	this.connect();
}

/**
 * Connect.
 */
NetPokerClient.prototype.connect = function() {
	this.connection = new MessageWebSocketConnection();
	this.connection.on(MessageWebSocketConnection.CONNECT, this.onConnectionConnect, this);
	this.connection.on(MessageWebSocketConnection.CLOSE, this.onConnectionClose, this);
	this.connection.connect(NET_POKER_URL);
	this.loadingScreen.show("CONNECTING");
}

/**
 * Connection complete.
 */
NetPokerClient.prototype.onConnectionConnect = function() {
	console.log("**** connected");
	this.protoConnection = new ProtoConnection(this.connection);
	this.netPokerClientController.setProtoConnection(this.protoConnection);
	this.loadingScreen.hide();
}

/**
 * Connection complete.
 */
NetPokerClient.prototype.onConnectionClose = function() {
	console.log("**** connection closed");
	this.protoConnection = null;
	this.netPokerClientController.setProtoConnection(null);
	this.loadingScreen.show("CONNECTION ERROR");
	setTimeout(this.connect.bind(this), 3000);
}

module.exports = NetPokerClient;