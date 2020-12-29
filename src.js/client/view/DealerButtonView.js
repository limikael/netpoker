/**
 * Client.
 * @module client
 */

const TWEEN = require('@tweenjs/tween.js');

/**
 * Dialog view.
 * @class DealerButtonView
 */
class DealerButtonView extends PIXI.Container {
	constructor(client) {
		super();

		this.resources=client.getResources();

		var dealerButtonTexture = this.resources.getTexture("dealerButton");
		this.sprite = new PIXI.Sprite(dealerButtonTexture);
		this.addChild(this.sprite);
		this.hide();
	}

	/**
	 * Set seat index
	 * @method setSeatIndex
	 */
	setSeatIndex = function(seatIndex) {
		this.position = this.resources.getPoint("dealerButtonPosition"+seatIndex);
		this.emit("animationDone");
	};

	/**
	 * Animate to seat index.
	 * @method animateToSeatIndex
	 */
	animateToSeatIndex(seatIndex) {
		if (!this.visible)
			throw new Error("Can't animate when not visible");

		var destination = this.resources.getPoint("dealerButtonPosition"+seatIndex);
		var tween = new TWEEN.Tween(this.position)
			.to({
				x: destination.x,
				y: destination.y
			}, 1000)
			.easing(TWEEN.Easing.Quadratic.Out)
			.onComplete(this.onShowComplete.bind(this))
			.start();
	};

	/**
	 * Show Complete.
	 * @method onShowComplete
	 */
	onShowComplete() {
		this.emit("animationDone");
	}

	/**
	 * Hide.
	 * @method hide
	 */
	hide() {
		this.visible = false;
	}

	/**
	 * Show.
	 * @method show
	 */
	show(seatIndex, animate) {
		if (this.visible && animate) {
			this.animateToSeatIndex(seatIndex);
		} else {
			this.visible = true;
			this.setSeatIndex(seatIndex);
		}
	}
}

module.exports = DealerButtonView;