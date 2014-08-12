var PIXI = require("pixi");
var FunctionUtil = require("../../utils/FunctionUtil");
var Resources = require("../resources/Resources");

/**
 * A card view.
 * @class CardView
 */
function CardView() {
	PIXI.DisplayObjectContainer.call(this);
	this.targetPosition = null;

	this.frame = new PIXI.Sprite(Resources.getInstance().cardFrame);
	this.addChild(this.frame);

	this.back = new PIXI.Sprite(Resources.getInstance().cardBack);
	this.addChild(this.back);
}

FunctionUtil.extend(CardView, PIXI.DisplayObjectContainer);

/**
 * Set card data.
 * @method setCardData
 */
CardView.prototype.setCardData = function(cardData) {
	this.cardData = cardData;

	if (this.cardData.isShown()) {
		this.back.visible = false;
		this.frame.visible = true;
	} else {
		this.back.visible = true;
		this.frame.visible = false;
	}
}

/**
 * Set card data.
 * @method setCardData
 */
CardView.prototype.setTargetPosition = function(point) {
	this.targetPosition = point;

	this.position.x = point.x;
	this.position.y = point.y;
}

module.exports = CardView;