var Thenable = require("tinp");
var PIXI = require("pixi.js");
var UrlUtil = require("../../utils/UrlUtil");
var HttpRequest = require("../../utils/HttpRequest");

/**
 * Resources
 * @class Resources
 */
function Resources() {
	this.spriteSheets = [];
	this.skinSources = [];
	this.data = [];
	this.loadThenable = null;
	this.skinSourceIndex = 0;
}

/**
 * Set sprite sheet.
 * @method setSpriteSheet
 */
Resources.prototype.setSpriteSheet = function(spriteSheet) {
	this.spriteSheets = [spriteSheet];
}

/**
 * Add a sprite sheet.
 * @method addSpriteSheet
 */
Resources.prototype.addSpriteSheet = function(spriteSheet) {
	this.spriteSheets.push(spriteSheet);
}

/**
 * Add a cascading skin source.
 * Object or url.
 * @method source
 */
Resources.prototype.addSkinSource = function(source) {
	this.skinSources.push(source);
}

/**
 * Get a Point resource.
 * @method getPoint
 */
Resources.prototype.getPoint = function(id) {
	this.assertKeyExists(id);

	return new PIXI.Point(this.data[id][0], this.data[id][1]);
}

/**
 * Get a string resource.
 * @method getString
 */
Resources.prototype.getString = function(id) {
	this.assertKeyExists(id);

	return this.data[id].toString();
}

/**
 * Get value.
 * @method getValue
 */
Resources.prototype.getValue = Resources.prototype.getString;

/**
 * Get color.
 * @method getValue
 */
Resources.prototype.getColor = Resources.prototype.getString;

/**
 * Get Texture.
 * @method getTexture
 */
Resources.prototype.getTexture = function(id) {
	var texture = PIXI.Texture.fromFrame(this.getString(id));

	return texture;
}

/**
 * Assert that the key exists.
 * @method assertKeyExists
 * @private
 */
Resources.prototype.assertKeyExists = function(id) {
	if (!this.data.hasOwnProperty(id))
		throw new Error("No such resource: " + id);
}

/**
 * Does this key exist?
 * @method keyExists
 */
Resources.prototype.keyExists = function(id) {
	return this.data.hasOwnProperty(id);
}

/**
 * Load resources.
 * @method load
 */
Resources.prototype.load = function() {
	if (this.loadThenable)
		throw new Error("Already loading");

	this.loadThenable = new Thenable();
	this.skinSourceIndex = 0;

	if (this.spriteSheets.length) {
		this.assetLoader = new PIXI.AssetLoader(this.spriteSheets);
		this.assetLoader.on("onComplete", this.onAssetLoaderComplete.bind(this));
		this.assetLoader.on("onProgress", this.onAssetLoaderProgress.bind(this));
		//console.log("loading assets: "+this.spriteSheets);
		this.assetLoader.load();
	} else {
		this.loadNextSkinSource();
	}

	return this.loadThenable;
}

/**
 * Asset loader progress.
 * @method onAssetLoaderProgress
 */
Resources.prototype.onAssetLoaderProgress = function(ev) {
	console.log("asset loader progress");
	/*	console.log(ev);

		ev.loader.ajaxRequest.onprogress = function() {
			console.log("request progres...");
		};

		ev.loader.ajaxRequest.addEventListener("progress", function() {
			console.log("progress...");
		});*/
}

/**
 * Asset loader complete.
 * @method onAssetLoaderComplete
 */
Resources.prototype.onAssetLoaderComplete = function() {
	//console.log("asset loader complete, loading skin");
	this.loadNextSkinSource();
}

/**
 * Process next skin source in sequence.
 * @method loadNextSkinSource
 * @private
 */
Resources.prototype.loadNextSkinSource = function() {
	if (this.skinSourceIndex >= this.skinSources.length) {
		//console.log("resolving thenable...");
		this.loadThenable.resolve();
		return;
	}

	var o = this.skinSources[this.skinSourceIndex];

	if (typeof o == "object") {
		this.processSkinData(o);
		return;
	}

	var request = new HttpRequest(UrlUtil.makeAbsolute(o));
	request.setResultType("json");

	request.send().then(
		this.onSkinSourceLoaded.bind(this),
		this.onSkinSourceLoadError.bind(this)
	);
}

/**
 * Skin source loaded.
 * @method onSkinSourceLoaded
 */
Resources.prototype.onSkinSourceLoaded = function(data) {
	this.processSkinData(data);
}

/**
 * Skin source load error.
 * @method onSkinSourceLoadError
 */
Resources.prototype.onSkinSourceLoadError = function(error) {
	this.loadThenable.reject(error);
}

/**
 * Process skin data.
 * @method processSkinData
 */
Resources.prototype.processSkinData = function(data) {
	for (i in data)
		this.data[i] = data[i];

	this.skinSourceIndex++;
	this.loadNextSkinSource();
}

module.exports = Resources;