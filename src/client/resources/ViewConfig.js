/**
 * Client.
 * @module client
 */

/**
 * View configuration.
 * @class ViewConfig
 */
function ViewConfig() {
	this.playAnimations = true;
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

module.exports = ViewConfig;