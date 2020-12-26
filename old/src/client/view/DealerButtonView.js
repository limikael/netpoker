/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var TWEEN = require("tween.js");
var EventDispatcher = require("yaed");
var inherits = require("inherits");

/**
 * Dialog view.
 * @class DealerButtonView
 */
function DealerButtonView(viewConfig, resources) {
	PIXI.DisplayObjectContainer.call(this);

	this.viewConfig = viewConfig;
	this.resources = resources;

	var dealerButtonTexture = this.resources.getTexture("dealerButton");
	this.sprite = new PIXI.Sprite(dealerButtonTexture);
	this.addChild(this.sprite);
	this.hide();
}

inherits(DealerButtonView, PIXI.DisplayObjectContainer);
EventDispatcher.init(DealerButtonView);

/**
 * Set seat index
 * @method setSeatIndex
 */
DealerButtonView.prototype.setSeatIndex = function(seatIndex) {
	this.position.x = this.resources.getPoint("dealerButtonPosition"+seatIndex).x;
	this.position.y = this.resources.getPoint("dealerButtonPosition"+seatIndex).y;
	this.dispatchEvent("animationDone", this);
};

/**
 * Animate to seat index.
 * @method animateToSeatIndex
 */
DealerButtonView.prototype.animateToSeatIndex = function(seatIndex) {
	if (!this.visible) {
		this.setSeatIndex(seatIndex);
		// todo dispatch event that it's complete?
		this.dispatchEvent("animationDone", this);
		return;
	}
	var destination = this.resources.getPoint("dealerButtonPosition"+seatIndex);
	var diffX = this.position.x - destination.x;
	var diffY = this.position.y - destination.y;
	var diff = Math.sqrt(diffX * diffX + diffY * diffY);

	var tween = new TWEEN.Tween(this.position)
		.to({
			x: destination.x,
			y: destination.y
		}, this.viewConfig.scaleAnimationTime(5 * diff))
		.easing(TWEEN.Easing.Quadratic.Out)
		.onComplete(this.onShowComplete.bind(this))
		.start();
};

/**
 * Show Complete.
 * @method onShowComplete
 */
DealerButtonView.prototype.onShowComplete = function() {
	this.dispatchEvent("animationDone", this);
}

/**
 * Hide.
 * @method hide
 */
DealerButtonView.prototype.hide = function() {
	this.visible = false;
}

/**
 * Show.
 * @method show
 */
DealerButtonView.prototype.show = function(seatIndex, animate) {
	if (this.visible && animate) {
		this.animateToSeatIndex(seatIndex);
	} else {
		this.visible = true;
		this.setSeatIndex(seatIndex);
	}
}

module.exports = DealerButtonView;