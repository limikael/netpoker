/**
 * Client.
 * @module client
 */

/**
 * View configuration.
 * @class ViewConfig
 */
function ViewConfig(resources) {
	this.playAnimations = true;
	this.resources = resources;
}

/**
 * Should we play animations?
 * @method setPlayAnimations
 */
ViewConfig.prototype.setPlayAnimations = function(value) {
	this.playAnimations = value;
}

/**
 * Should we play animations?
 * @method getPlayAnimations
 */
ViewConfig.prototype.getPlayAnimations = function() {
	return this.playAnimations;
}

/**
 * Scale animation time.
 * @method scaleAnimationTime
 */
ViewConfig.prototype.scaleAnimationTime = function(millis) {
	if (this.playAnimations)
		return millis;

	return 1;
}

/**
 * Get resources.
 * @method getResources
 */
ViewConfig.prototype.getResources = function() {
	return this.resources;
}

module.exports = ViewConfig;