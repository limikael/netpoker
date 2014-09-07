var PIXI = require("pixi.js");
var TWEEN = require("tween.js");
var FunctionUtil = require("../../utils/FunctionUtil");
var Resources = require("../resources/Resources");
var EventDispatcher = require("../../utils/EventDispatcher");

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
EventDispatcher.init(DealerButtonView);

/**
 * Set seat index
 * @method setSeatIndex
 */
DealerButtonView.prototype.setSeatIndex = function(seatIndex) {
	this.position.x = Resources.getInstance().dealerButtonPositions[seatIndex].x;
	this.position.y = Resources.getInstance().dealerButtonPositions[seatIndex].y;
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
	var destination = Resources.getInstance().dealerButtonPositions[seatIndex];
	var diffX = this.position.x - destination.x;
	var diffY = this.position.y - destination.y;
	var diff = Math.sqrt(diffX*diffX + diffY*diffY);
	var thisPtr = this;
	var tween = new TWEEN.Tween( this.position )
            .to( { x: destination.x, y: destination.y }, 5*diff )
            .easing( TWEEN.Easing.Quadratic.Out )
            .onComplete(function()
			{
				thisPtr.dispatchEvent("animationDone", thisPtr);
			})
            .start();
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
 * @method show
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