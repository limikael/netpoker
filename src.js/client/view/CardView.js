/**
 * Client.
 * @module client
 */

var TWEEN = require('@tweenjs/tween.js');
var CardFrontView = require("./CardFrontView");

/**
 * A card view.
 * @class CardView
 */
class CardView extends PIXI.Container {
	constructor(client) {
		super();
		this.targetPosition = null;
		this.resources = client.getResources();

		this.front = new CardFrontView(client);
		this.addChild(this.front);
		this.back = this.resources.createSprite("cardBack");
		this.addChild(this.back);

		this.maskGraphics = new PIXI.Graphics();
		this.maskGraphics.beginFill(0x000000);
		this.maskGraphics.drawRect(0, 0, this.back.width, this.back.height);
		this.maskGraphics.endFill();
		this.addChild(this.maskGraphics);

		this.mask = this.maskGraphics;
	}

	/**
	 * Set card data.
	 * @method setCardData
	 */
	setCardData=(cardData)=>{
		this.cardData = cardData;

		if (this.cardData.isShown()) {
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
	setTargetPosition(point) {
		this.targetPosition = point;

		this.position.x = point.x;
		this.position.y = point.y;
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
	show(animate) {
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
			.to({
				x: destination.x,
				y: destination.y
			}, 500)
			.easing(TWEEN.Easing.Quadratic.Out)
			.onStart(this.onShowStart.bind(this))
			.onComplete(this.onShowComplete.bind(this))
			.start();
	}

	/**
	 * Show complete.
	 * @method onShowComplete
	 */
	onShowStart() {
		this.visible = true;
	}

	/**
	 * Show complete.
	 * @method onShowComplete
	 */
	onShowComplete() {
		if (this.cardData.isShown()) {
			this.back.visible = false;
			this.front.visible = true;
		}
		this.emit("animationDone");
	}

	/**
	 * Fold.
	 * @method fold
	 */
	fold() {
		var o = {
			x: this.targetPosition.x,
			y: this.targetPosition.y + 80
		};

		this.t0 = new TWEEN.Tween(this.position)
			.to(o, 500)
			.easing(TWEEN.Easing.Quadratic.Out)
			.onUpdate(this.onFoldUpdate.bind(this))
			.onComplete(this.onFoldComplete.bind(this))
			.start();
	}

	/**
	 * Fold animation update.
	 * @method onFoldUpdate
	 */
	onFoldUpdate(progress) {
		this.maskGraphics.scale.y = 1 - progress;
	}

	/**
	 * Fold animation complete.
	 * @method onFoldComplete
	 */
	onFoldComplete() {
		this.dispatchEvent("animationDone");
	}
}

module.exports = CardView;