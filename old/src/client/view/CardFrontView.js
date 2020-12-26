/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var inherits = require("inherits");

/**
 * The front view of a card.
 * @class CardFrontView
 */
function CardFrontView(viewConfig, resources) {
	PIXI.DisplayObjectContainer.call(this);

	this.resources = resources;
};
inherits(CardFrontView, PIXI.DisplayObjectContainer);


CardFrontView.prototype.setCardData = function(cardData) {
	this.cardData = cardData;

	// cardDiamonds2 cardDiamonds3 cardDiamonds4 cardDiamonds5 ...  cardDiamondsQ  cardDiamondsK  cardDiamondsA
	var cardTexture;
	var customName = "card" + this.cardData.getLongSuitString() + this.cardData.getCardValueString();

	if (this.resources.keyExists(customName))
		cardTexture = this.resources.getTexture(customName);

	if (cardTexture) {
		this.frame = new PIXI.Sprite(cardTexture);
		this.addChild(this.frame);
	} else {
		this.frame = new PIXI.Sprite(this.resources.getTexture("cardFrame"));
		this.addChild(this.frame);


		this.suit = new PIXI.Sprite(this.resources.getTexture("suitSymbol" + this.cardData.getSuitIndex()));
		this.suit.position.x = 8;
		this.suit.position.y = 25;
		this.addChild(this.suit);

		var style = {
			font: "bold 16px Arial"
		};

		this.valueField = new PIXI.Text("[val]", style);
		this.addChild(this.valueField);
		this.valueField.style.fill = this.cardData.getColor();

		this.valueField.setText(this.cardData.getCardValueString());
		this.valueField.updateTransform();
		this.valueField.position.x = 17 - this.valueField.canvas.width / 2;
		this.valueField.position.y = 5;

		this.suit.setTexture(this.resources.getTexture("suitSymbol" + this.cardData.getSuitIndex()));
	}
};



module.exports = CardFrontView;