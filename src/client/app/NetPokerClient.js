/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var PixiApp = require("pixiapp");
var NetPokerClientView = require("../view/NetPokerClientView");
var NetPokerClientController = require("../controller/NetPokerClientController");
var MessageWebSocketConnection = require("../../utils/MessageWebSocketConnection");
var MessageRequestConnection = require("../../utils/MessageRequestConnection");
var ProtoConnection = require("../../proto/ProtoConnection");
var LoadingScreen = require("../view/LoadingScreen");
var StateCompleteMessage = require("../../proto/messages/StateCompleteMessage");
var InitMessage = require("../../proto/messages/InitMessage");
var Resources = require("../resources/Resources");
var ViewConfig = require("../resources/ViewConfig");
var url = require("url");
var TWEEN = require("tween.js");
var inherits = require("inherits");
var UrlUtil = require("../../utils/UrlUtil");
var DefaultSkin = require("../resources/DefaultSkin");

/**
 * Main entry point for client.
 * @class NetPokerClient
 */
function NetPokerClient() {
	PixiApp.call(this, 960, 720);

	this.verticalAlign = PixiApp.TOP;

	this.resources = new Resources();
	this.resources.addSkinSource(DefaultSkin);
	this.resources.addSpriteSheet("netpokerclient.spritesheet.json");

	this.loadingScreen = new LoadingScreen();
	this.addChild(this.loadingScreen);
	this.enterAppState("LOADING", 0);
	this.loadingScreen.show("LOADING");

	this.url = null;
	this.tableId = null;
	this.tournamentId = null;
	this.viewConfig = new ViewConfig();

	this.on("frame", TWEEN.update);
}

inherits(NetPokerClient, PixiApp);

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
 * Set tournament id.
 * @method setTournamentId
 */
NetPokerClient.prototype.setTournamentId = function(tournamentId) {
	this.tournamentId = tournamentId;
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
 * Add skin source.
 * @method addSkinSource
 */
NetPokerClient.prototype.addSkinSource = function(skin) {
	this.resources.addSkinSource(skin);
}

/**
 * Add sprite sheet.
 * @method addSpriteSheet
 */
NetPokerClient.prototype.addSpriteSheet = function(spriteSheet) {
	this.resources.addSpriteSheet(spriteSheet);
}

/**
 * Set sprite sheet.
 * @method setSpriteSheet
 */
NetPokerClient.prototype.setSpriteSheet = function(spriteSheet) {
	this.resources.setSpriteSheet(spriteSheet);
}

/**
 * Run.
 * @method run
 */
NetPokerClient.prototype.run = function() {
	//console.log("loading resources.....");
	this.enterAppState("LOADING RESOURCES", 50);

	this.resources.load().then(
		this.onResourcesLoaded.bind(this),
		this.onResourcesError.bind(this)
	);
}

/**
 * Error while loading resources.
 * @method onResourcesError
 */
NetPokerClient.prototype.onResourcesError = function() {
	console.log("resource error");

	this.enterAppState("ERROR LOADING RESOURCES");
}

/**
 * Assets loaded, connect.
 * @method onAssetLoaderComplete
 * @private
 */
NetPokerClient.prototype.onResourcesLoaded = function() {
	//console.log("resources loaded complete...");

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
		this.enterAppState("NEED URL");
		return;
	}

	var parsedUrl = url.parse(this.url);

	console.log(parsedUrl);

	if (!parsedUrl.protocol || parsedUrl.protocol == "http:" || parsedUrl.protocol == "https:") {
		this.url = UrlUtil.makeAbsolute(this.url);
		this.connection = new MessageRequestConnection();
	} else {
		this.connection = new MessageWebSocketConnection();
	}

	this.connection.on(MessageWebSocketConnection.CONNECT, this.onConnectionConnect, this);
	this.connection.on(MessageWebSocketConnection.CLOSE, this.onConnectionClose, this);

	console.log("Connecting to: " + this.url);

	this.enterAppState("CONNECTING", 65);
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
	this.enterAppState("INITIALIZING", 80);

	var initMessage = new InitMessage(this.token);

	if (this.tableId)
		initMessage.setTableId(this.tableId);

	if (this.tournamentId)
		initMessage.setTournamentId(this.tournamentId);

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
	this.enterAppState(null);
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
	this.enterAppState("CONNECTION ERROR");
	setTimeout(this.connect.bind(this), 3000);
}

/**
 * Enter app state.
 * @method enterAppState
 * @private
 */
NetPokerClient.prototype.enterAppState = function(message, progress) {
	if (message)
		this.loadingScreen.show(message);

	else
		this.loadingScreen.hide();

	this.trigger({
		type: "appStateChange",
		message: message,
		progress: progress
	});
}

/**
 * Utility function to get all query string params.
 * @method getQueryStringParams
 * @static
 */
NetPokerClient.getQueryStringParams = function() {
	var params = {};
	(function() {

		var match,
			pl = /\+/g, // Regex for replacing addition symbol with a space
			search = /([^&=]+)=?([^&]*)/g,
			decode = function(s) {
				return decodeURIComponent(s.replace(pl, " "));
			},
			query = window.location.search.substring(1).replace(/amp;/g, "");

		while (match = search.exec(query))
			params[decode(match[1])] = decode(match[2]);
	})();

	return params;
}

module.exports = NetPokerClient;