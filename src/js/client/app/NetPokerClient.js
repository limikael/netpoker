var PIXI = require("pixi.js");
var FunctionUtil = require("../../utils/FunctionUtil");
var PixiApp = require("../../utils/PixiApp");
var NetPokerClientView = require("../view/NetPokerClientView");
var NetPokerClientController = require("../controller/NetPokerClientController");
var MessageWebSocketConnection = require("../../utils/MessageWebSocketConnection");
var ProtoConnection = require("../../proto/ProtoConnection");
var LoadingScreen = require("../view/LoadingScreen");
var StateCompleteMessage = require("../../proto/messages/StateCompleteMessage");
var InitMessage = require("../../proto/messages/InitMessage");

/**
 * Main entry point for client.
 * @class NetPokerClient
 */
function NetPokerClient() {
	PixiApp.call(this, 960, 720);

	this.loadingScreen = new LoadingScreen();
	this.addChild(this.loadingScreen);
	this.loadingScreen.show("LOADING");

	this.url = null;

	this.tableId=null;
}

FunctionUtil.extend(NetPokerClient, PixiApp);

/**
 * Set url.
 */
NetPokerClient.prototype.setUrl = function(url) {
	this.url = url;
}

/**
 * Set table id.
 */
NetPokerClient.prototype.setTableId = function(tableId) {
	this.tableId = tableId;
}

/**
 * Set token.
 */
NetPokerClient.prototype.setToken = function(token) {
	this.token = token;
}

/**
 * Run.
 */
NetPokerClient.prototype.run = function() {
	var assets = [
		"table.png",
		"components.png"
	];

	this.assetLoader = new PIXI.AssetLoader(assets);
	this.assetLoader.addEventListener("onComplete", this.onAssetLoaderComplete.bind(this));
	this.assetLoader.load();
}

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
	if (!this.url || !this.token) {
		this.loadingScreen.show("NEED URL AND TOKEN");
		return;
	}

	this.connection = new MessageWebSocketConnection();
	this.connection.on(MessageWebSocketConnection.CONNECT, this.onConnectionConnect, this);
	this.connection.on(MessageWebSocketConnection.CLOSE, this.onConnectionClose, this);
	this.connection.connect(this.url);
	this.loadingScreen.show("CONNECTING");
}

/**
 * Connection complete.
 */
NetPokerClient.prototype.onConnectionConnect = function() {
	console.log("**** connected");
	this.protoConnection = new ProtoConnection(this.connection);
	this.protoConnection.addMessageHandler(StateCompleteMessage, this.onStateCompleteMessage, this);
	this.netPokerClientController.setProtoConnection(this.protoConnection);
	this.loadingScreen.show("INITIALIZING");

	var initMessage=new InitMessage(this.token);

	if (this.tableId)
		initMessage.setTableId(this.tableId);

	this.protoConnection.send(initMessage);
}

/**
 * State complete.
 */
NetPokerClient.prototype.onStateCompleteMessage=function() {
	this.loadingScreen.hide();
}

/**
 * Connection complete.
 */
NetPokerClient.prototype.onConnectionClose = function() {
	console.log("**** connection closed");
	if (this.protoConnection)
		this.protoConnection.removeMessageHandler(StateCompleteMessage, this.onStateCompleteMessage, this);

	this.protoConnection = null;
	this.netPokerClientController.setProtoConnection(null);
	this.loadingScreen.show("CONNECTION ERROR");
	setTimeout(this.connect.bind(this), 3000);
}

module.exports = NetPokerClient;