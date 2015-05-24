/**
 * Resources
 * @class Resources
 */
function Resources() {
	this.data = [];
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
 * Get Texture.
 * @method getTexture
 */
Resources.prototype.getTexture = function(id) {
	return Texture.fromImage(this.getString(id));
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

module.exports = Resources;