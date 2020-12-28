/**
 * Client.
 * @module client
 */

/**
 * The front view of a card.
 * @class CardFrontView
 */
class CardFrontView extends PIXI.Container {
	constructor(client) {
		super();
		this.resources=client.getResources();

		this.frame = this.resources.createSprite("cardFrame");
		this.addChild(this.frame);

		var style = {
			fontFamily: "Arial",
			fontSize: 16,
			fontWeight: "bold"
		};

		this.valueField = new PIXI.Text("[val]",style);
		this.valueField.position.x = 10;
		this.valueField.position.y = 5;
		this.addChild(this.valueField);

		this.suit = new PIXI.Sprite();
		this.suit.position.x = 8;
		this.suit.position.y = 25;
		this.addChild(this.suit);
	}

	setCardData(cardData) {
		this.cardData = cardData;

		this.suit.texture=this.resources.getTexture("suitSymbol" + this.cardData.getSuitIndex());
		this.valueField.style.fill = this.cardData.getColor();
		this.valueField.text=this.cardData.getCardValueString();
		this.valueField.position.x = 17 - this.valueField.width / 2;
	}
}

module.exports = CardFrontView;