var PIXI = require("pixi.js");
var Tween = require("tween.js");
var FunctionUtil = require("../../utils/FunctionUtil");
var Resources = require("../resources/Resources");

/**
 * Dialog view.
 * @class DealerButtonView
 */
function DealerButtonView() {
	PIXI.DisplayObjectContainer.call(this);


	var dealerButtonTexture = Resources.getInstance().dealerButton;
	this.sprite = new PIXI.Sprite(dealerButtonTexture);
	this.addChild(this.sprite);
	this.hide();
}

FunctionUtil.extend(DealerButtonView, PIXI.DisplayObjectContainer);

/**
 * Set seat index
 * @method setSeatIndex
 */
DealerButtonView.prototype.setSeatIndex = function(seatIndex) {
	this.position.x = Resources.getInstance().dealerButtonPositions[seatIndex].x;
	this.position.y = Resources.getInstance().dealerButtonPositions[seatIndex].y;
};
/**
 * Animate to seat index.
 */
DealerButtonView.prototype.animateToSeatIndex = function(seatIndex) {
	if (!this.visible) {
		this.setSeatIndex(seatIndex);
		// todo dispatch event that it's complete?
		return;
	}

	console.log("Animate Seat Index");
	// Todo animate.
	this.position.x = Resources.getInstance().dealerButtonPositions[seatIndex].x;
	this.position.y = Resources.getInstance().dealerButtonPositions[seatIndex].y;
/*	Tween.Tween(this.position).to(
			{
				x: Resources.getInstance().dealerButtonPositions[seatIndex].x, 
				y: Resources.getInstance().dealerButtonPositions[seatIndex].y
			}, 1000).easing(Tween.Easing.Elastic.InOut).start();*/

};

/**
 * Hide.
 * @method hide
 */
DealerButtonView.prototype.hide = function() {
	this.visible = false;
}

/**
 * Show.
 */
DealerButtonView.prototype.show = function(seatIndex, animate) {
	this.visible = true;
	if(animate) {
		this.animateToSeatIndex(seatIndex);
	}
	else {
		this.setSeatIndex(seatIndex);
	}
}

module.exports = DealerButtonView;