/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var TWEEN = require("tween.js");
var CardFrontView = require("./CardFrontView");
var EventDispatcher = require("yaed");
var inherits = require("inherits");

/**
 * A card view.
 * @class CardView
 */
function CardView(viewConfig, resources) {
	PIXI.DisplayObjectContainer.call(this);
	this.targetPosition = null;

	this.viewConfig = viewConfig;
	this.resources = resources;


	this.front = new CardFrontView(this.viewConfig, this.resources);//PIXI.Sprite(this.resources.getTexture("cardFrame"));
	this.addChild(this.front);
/*
	this.suit = new PIXI.Sprite(this.resources.getTexture("suitSymbol" + 0));
	this.suit.position.x = 8;
	this.suit.position.y = 25;
	this.addChild(this.suit);
*/
/*	var style = {
		font: "bold 16px Arial"
	};

	this.valueField = new PIXI.Text("[val]", style);
	this.valueField.position.x = 6;
	this.valueField.position.y = 5;
	this.addChild(this.valueField);
*/
	this.back = new PIXI.Sprite(this.resources.getTexture("cardBack"));
	this.addChild(this.back);


	this.maskGraphics = new PIXI.Graphics();
	this.maskGraphics.beginFill(0x000000);
	this.maskGraphics.drawRect(0, 0, this.back.width, this.back.height);
	this.maskGraphics.endFill();
	this.addChild(this.maskGraphics);

	this.mask = this.maskGraphics;
}

inherits(CardView, PIXI.DisplayObjectContainer);
EventDispatcher.init(CardView);

/**
 * Set card data.
 * @method setCardData
 */
CardView.prototype.setCardData = function(cardData) {
	this.cardData = cardData;


	if (this.cardData.isShown()) {
		/*
		this.back.visible = false;
		this.frame.visible = true;
*/
/*
		this.valueField.style.fill = this.cardData.getColor();

		this.valueField.setText(this.cardData.getCardValueString());
		this.valueField.updateTransform();
		this.valueField.position.x = 17 - this.valueField.canvas.width / 2;

		this.suit.setTexture(this.resources.getTexture("suitSymbol" + this.cardData.getSuitIndex()));
		*/
		this.front.setCardData(this.cardData);

		this.maskGraphics.beginFill(0x000000);
		this.maskGraphics.drawRect(0, 0, this.front.width, this.front.height);
		this.maskGraphics.endFill();
	}
	this.back.visible = true;
	this.front.visible = false;
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
 * @method hide
 */
CardView.prototype.hide = function() {
	this.visible = false;
}

/**
 * Show.
 * @method show
 */
CardView.prototype.show = function(animate, delay) {
	/*if(delay == undefined)
		delay = 1;
	*/
	this.maskGraphics.scale.y = 1;
	this.position.x = this.targetPosition.x;
	this.position.y = this.targetPosition.y;
	if (!animate) {
		this.visible = true;
		this.onShowComplete();
		return;
	}
	this.mask.height = this.height;

	var destination = {
		x: this.position.x,
		y: this.position.y
	};
	this.position.x = (this.parent.width - this.width) * 0.5;
	this.position.y = -this.height;

	var diffX = this.position.x - destination.x;
	var diffY = this.position.y - destination.y;
	var diff = Math.sqrt(diffX * diffX + diffY * diffY);

	var tween = new TWEEN.Tween(this.position)
		//            .delay(delay)
		.to({
			x: destination.x,
			y: destination.y
		}, this.viewConfig.scaleAnimationTime(500))
		.easing(TWEEN.Easing.Quadratic.Out)
		.onStart(this.onShowStart.bind(this))
		.onComplete(this.onShowComplete.bind(this))
		.start();
}

/**
 * Show complete.
 * @method onShowComplete
 */
CardView.prototype.onShowStart = function() {
	this.visible = true;
}

/**
 * Show complete.
 * @method onShowComplete
 */
CardView.prototype.onShowComplete = function() {
	if (this.cardData.isShown()) {
		this.back.visible = false;
		this.front.visible = true;
	}
	this.dispatchEvent("animationDone", this);
}

/**
 * Fold.
 * @method fold
 */
CardView.prototype.fold = function() {
	var o = {
		x: this.targetPosition.x,
		y: this.targetPosition.y + 80
	};

	var time = this.viewConfig.scaleAnimationTime(500);
	this.t0 = new TWEEN.Tween(this.position)
		.to(o, time)
		.easing(TWEEN.Easing.Quadratic.Out)
		.onUpdate(this.onFoldUpdate.bind(this))
		.onComplete(this.onFoldComplete.bind(this))
		.start();
}

/**
 * Fold animation update.
 * @method onFoldUpdate
 */
CardView.prototype.onFoldUpdate = function(progress) {
	this.maskGraphics.scale.y = 1 - progress;
}

/**
 * Fold animation complete.
 * @method onFoldComplete
 */
CardView.prototype.onFoldComplete = function() {
	this.dispatchEvent("animationDone");
}

module.exports = CardView;