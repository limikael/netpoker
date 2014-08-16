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

	this.suit = new PIXI.Sprite(Resources.getInstance().suitSymbols[0]);
	this.suit.position.x = 8;
	this.suit.position.y = 25;
	this.addChild(this.suit);

	var style = {
		font: "bold 16px Arial"
	};

	this.valueField = new PIXI.Text("[val]", style);
	this.valueField.position.x = 6;
	this.valueField.position.y = 5;
	this.addChild(this.valueField);

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

		this.valueField.style.fill = this.cardData.getColor();

		this.valueField.setText(this.cardData.getCardValueString());
		this.valueField.updateTransform();
		this.valueField.position.x = 17 - this.valueField.canvas.width / 2;

		this.suit.setTexture(Resources.getInstance().suitSymbols[this.cardData.getSuitIndex()]);
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

/**
 * Hide.
 */
CardView.prototype.hide = function() {
	this.visible = false;
}

/**
 * Show.
 */
CardView.prototype.show = function() {
	this.visible = true;
}

module.exports = CardView;