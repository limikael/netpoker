var Thenable = require("tinp");
var PIXI = require("pixi.js");
var request = require("request");
var UrlUtil = require("../../utils/UrlUtil");

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
		//console.log("loading assets: "+this.spriteSheets);
		this.assetLoader.load();
	} else {
		this.loadNextSkinSource();
	}

	return this.loadThenable;
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

	request(
		UrlUtil.makeAbsolute(o),
		this.onSkinSourceLoaded.bind(this)
	);
}

/**
 * Skin source loaded.
 * @method onSkinSourceLoaded
 */
Resources.prototype.onSkinSourceLoaded = function(error, response, body) {
	if (error) {
		this.loadThenable.reject(error);
		return;
	}

	if (response.statusCode != 200) {
		this.loadThenable.reject(response.statusCode);
		return;
	}

	var data = JSON.parse(body);
	this.processSkinData(data);
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