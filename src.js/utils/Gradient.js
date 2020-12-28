/**
 * Utilities.
 * @module utils
 */

/**
 * Create a sprite with a gradient.
 * @class Gradient
 */
class Gradient {
	constructor() {
		this.width = 100;
		this.height = 100;
		this.stops = [];
	}

	/**
	 * Set size of the gradient.
	 * @method setSize
	 */
	setSize(w, h) {
		this.width = w;
		this.height = h;
	}

	/**
	 * Add color stop.
	 * @method addColorStop
	 */
	addColorStop(weight, color) {
		this.stops.push({
			weight: weight,
			color: color
		});
	}

	/**
	 * Render the sprite.
	 * @method createSprite
	 */
	createSprite() {
		//console.log("rendering gradient...");
		var c = document.createElement("canvas");
		c.width = this.width;
		c.height = this.height;

		var ctx = c.getContext("2d");
		var grd = ctx.createLinearGradient(0, 0, 0, this.height);
		var i;

		for (i = 0; i < this.stops.length; i++)
			grd.addColorStop(this.stops[i].weight, this.stops[i].color);

		ctx.fillStyle = grd;
		ctx.fillRect(0, 0, this.width, this.height);

		return new PIXI.Sprite(PIXI.Texture.fromCanvas(c));
	}
}

module.exports = Gradient;