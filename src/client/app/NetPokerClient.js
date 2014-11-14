/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var FunctionUtil = require("../../utils/FunctionUtil");
var PixiApp = require("pixiapp");
var NetPokerClientView = require("../view/NetPokerClientView");
var NetPokerClientController = require("../controller/NetPokerClientController");
var MessageWebSocketConnection = require("../../utils/MessageWebSocketConnection");
var MessageRequestConnection = require("../../utils/MessageRequestConnection");
var ProtoConnection = require("../../proto/ProtoConnection");
var LoadingScreen = require("../view/LoadingScreen");
var StateCompleteMessage = require("../../proto/messages/StateCompleteMessage");
var InitMessage = require("../../proto/messages/InitMessage");
var Resources = require("resource-fiddle");
var ViewConfig = require("../resources/ViewConfig");
var url = require("url");
var DefaultSkin = require("../resources/DefaultSkin");
var TWEEN = require("tween.js");

/**
 * Main entry point for client.
 * @class NetPokerClient
 */
function NetPokerClient() {
	PixiApp.call(this, 960, 720);

	this.verticalAlign = PixiApp.TOP;

	this.resources = new Resources();
	this.resources.addSource(DefaultSkin);

	this.loadingScreen = new LoadingScreen();
	this.addChild(this.loadingScreen);
	this.loadingScreen.show("LOADING");

	this.url = null;
	this.tableId = null;
	this.viewConfig = new ViewConfig();

	this.on("frame", TWEEN.update);
}

FunctionUtil.extend(NetPokerClient, PixiApp);

/**
 * Set url.
 * @method setUrl
 */
NetPokerClient.prototype.setUrl = function(url) {
	this.url = url;
}

/**
 * Set table id.
 * @method setTableId
 */
NetPokerClient.prototype.setTableId = function(tableId) {
	this.tableId = tableId;
}

/**
 * Set view case.
 * @method setViewCase
 */
NetPokerClient.prototype.setViewCase = function(viewCase) {
	console.log("****** running view case: " + viewCase);
	this.viewCase = viewCase;
}

/**
 * Set token.
 * @method setToken
 */
NetPokerClient.prototype.setToken = function(token) {
	this.token = token;
}

/**
 * Set token.
 * @method setSkin
 */
NetPokerClient.prototype.setSkin = function(skin) {
	this.resources.addSource(skin);
}

/**
 * Run.
 * @method run
 */
NetPokerClient.prototype.run = function() {
	/*
	var assets = [
		"table.png",
		"components.png"
	];
	if ((this.resources.skin != null) && (this.resources.skin.textures != null)) {
		for (var i = 0; i < this.resources.skin.textures.length; i++) {
			assets.push(this.resources.skin.textures[i].file);
			console.log("add to load list: " + this.resources.skin.textures[i].file);
		}
	}

	this.assetLoader = new PIXI.AssetLoader(assets);
	this.assetLoader.addEventListener("onComplete", this.onAssetLoaderComplete.bind(this));
	this.assetLoader.load();
	*/

	if (this.resources.isLoading()) {
		this.resources.on(Resources.Loaded, this.onResourcesLoaded, this);
	} else {
		this.onResourcesLoaded();
	}
}

/**
 * Assets loaded, connect.
 * @method onAssetLoaderComplete
 * @private
 */
NetPokerClient.prototype.onResourcesLoaded = function() {
	console.log("resources loaded complete...");

	this.netPokerClientView = new NetPokerClientView(this.viewConfig, this.resources);
	this.addChildAt(this.netPokerClientView, 0);

	this.netPokerClientController = new NetPokerClientController(this.netPokerClientView);
	this.connect();
}

/**
 * Connect.
 * @method connect
 * @private
 */
NetPokerClient.prototype.connect = function() {
	if (!this.url) {
		this.loadingScreen.show("NEED URL");
		return;
	}

	var parsedUrl = url.parse(this.url);

	//console.log("protocol: " + parsedUrl.protocol);

	if (!parsedUrl.protocol) {
		console.log("window.location.href is: " + window.location.href);
		var path = window.location.href.substring(0, window.location.href.lastIndexOf("/") + 1);
		this.url = path + this.url;
		this.connection = new MessageRequestConnection();
	} else if (parsedUrl.protocol == "http:" ||
		parsedUrl.protocol == "https:") {
		this.connection = new MessageRequestConnection();
	} else {
		this.connection = new MessageWebSocketConnection();
	}

	this.connection.on(MessageWebSocketConnection.CONNECT, this.onConnectionConnect, this);
	this.connection.on(MessageWebSocketConnection.CLOSE, this.onConnectionClose, this);

	console.log("Connecting to: " + this.url);

	this.loadingScreen.show("CONNECTING");
	this.connection.connect(this.url);
}

/**
 * Connection complete.
 * @method onConnectionConnect
 * @private
 */
NetPokerClient.prototype.onConnectionConnect = function() {
	console.log("**** connected");
	this.protoConnection = new ProtoConnection(this.connection);
	this.protoConnection.addMessageHandler(StateCompleteMessage, this.onStateCompleteMessage, this);
	this.netPokerClientController.setProtoConnection(this.protoConnection);
	this.loadingScreen.show("INITIALIZING");

	var initMessage = new InitMessage(this.token);

	if (this.tableId)
		initMessage.setTableId(this.tableId);

	if (this.viewCase)
		initMessage.setViewCase(this.viewCase);

	this.protoConnection.send(initMessage);
}

/**
 * State complete.
 * @method onStateCompleteMessage
 * @private
 */
NetPokerClient.prototype.onStateCompleteMessage = function() {
	this.loadingScreen.hide();
}

/**
 * Connection closed.
 * @method onConnectionClose
 * @private
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