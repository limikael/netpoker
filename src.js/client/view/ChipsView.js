/**
 * Client.
 * @module client
 */

const TWEEN = require('@tweenjs/tween.js');

/**
 * A chips view.
 * @class ChipsView
 */
class ChipsView extends PIXI.Container {
	constructor(client) {
		super();

		this.resources = client.getResources();
		this.targetPosition = null;
		this.align = "left";
		this.value = 0;
		this.denominations = [500000, 100000, 25000, 5000, 1000, 500, 100, 25, 5, 1];
		this.stackClips = new Array();
		this.holder = new PIXI.Container();
		this.addChild(this.holder);

		this.tween = null;
	}

	/**
	 * Set alignment.
	 * @method setAlignment
	 */
	setAlignment(align) {
		if (!align)
			throw new Error("unknown alignment: " + align);

		this.align = align;
	}

	/**
	 * Set target position.
	 * @method setTargetPosition
	 */
	setTargetPosition(position) {
		//console.log("setting target position: " + JSON.stringify(position));

		this.targetPosition = position;
		this.position.x = position.x;
		this.position.y = position.y;
	}

	/**
	 * Set value.
	 * @method setValue
	 */
	setValue(value) {
		/*if (this.tween) {
			this.tween.onComplete(function() {});
			this.tween.onUpdate(function() {});
			this.tween.stop();
			this.tween = null;
		}*/

		if (this.targetPosition) {
			this.position.x = this.targetPosition.x;
			this.position.y = this.targetPosition.y;
		}

		//console.log("set value, seatIndex=" + this.seatIndex+", value="+value);

		this.value = value;

		var sprite;

		for (var i = 0; i < this.stackClips.length; i++)
			this.holder.removeChild(this.stackClips[i]);

		this.stackClips = new Array();

		/*if (this.toolTip != null)
			this.toolTip.text = "Bet: " + this.value.toString();*/

		var i;
		var stackClip = null;
		var stackPos = 0;
		var chipPos = 0;

		for (i = 0; i < this.denominations.length; i++) {
			var denomination = this.denominations[i];

			chipPos = 0;
			stackClip = null;
			while (value >= denomination) {
				if (stackClip == null) {
					stackClip = new PIXI.Container();
					stackClip.x = stackPos;
					stackPos += 40;
					this.holder.addChild(stackClip);
					this.stackClips.push(stackClip);
				}
				var texture = this.resources.getTexture("chip" + (i % 5));
				var chip = new PIXI.Sprite(texture);
				chip.position.y = chipPos;
				chipPos -= 5;
				stackClip.addChild(chip);
				value -= denomination;

				var denominationString;

				if (denomination >= 1000)
					denominationString = Math.round(denomination / 1000) + "K";

				else
					denominationString = denomination;

				if ((stackClip != null) && (value < denomination)) {

					var textField = new PIXI.Text(denominationString, {
						fontFamily: "Arial",
						fontWeight: "bold",
						fontSize: 12,
						align: "center",
						fill: this.resources.getColor("chipsColor" + (i % 5))
					});
					textField.position.x = (stackClip.width - textField.width) * 0.5;
					textField.position.y = chipPos + 11;
					textField.alpha = 0.5;
					/*
					textField.width = stackClip.width - 1;
					textField.height = 20;*/

					stackClip.addChild(textField);
				}
			}
		}

		switch (this.align) {
			case "left":
			case "L":
				this.holder.x = 0;
				break;

			case "center":
			case "C":
				this.holder.x = -this.holder.width / 2;
				break;

			case "right":
			case "R":
				this.holder.x = -this.holder.width;
				break;

			default:
				throw new Error("unknown align: " + this.align);
		}
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
	show() {
		this.visible = true;

		var destination = {
			x: this.targetPosition.x,
			y: this.targetPosition.y
		};
		this.position.x = (this.parent.width - this.width) * 0.5;
		this.position.y = -this.height;

		var diffX = this.position.x - destination.x;
		var diffY = this.position.y - destination.y;
		var diff = Math.sqrt(diffX * diffX + diffY * diffY);

		this.tween = new TWEEN.Tween(this.position)
			.to({
				x: destination.x,
				y: destination.y
			}, 3 * diff)
			.easing(TWEEN.Easing.Quadratic.Out)
			.onComplete(this.onShowComplete.bind(this))
			.start();
	}

	/**
	 * Show complete.
	 * @method onShowComplete
	 */
	onShowComplete() {

		this.dispatchEvent("animationDone", this);
	}

	/**
	 * Animate in.
	 * @method animateIn
	 */
	animateIn() {
		var o = {
			y: this.resources.getPoint("potPosition").y
		};

		switch (this.align) {
			case "left":
			case "L":
				o.x = this.resources.getPoint("potPosition").x - this.width / 2;
				break;

			case "center":
			case "C":
				o.x = this.resources.getPoint("potPosition").x;
				break;

			case "right":
			case "R":
				o.x = this.resources.getPoint("potPosition").x + this.width / 2;
				break;

			default:
				throw new Error("unknown align: " + this.align);
				break;
		}

		this.tween = new TWEEN.Tween(this)
			.to({
				y: this.resources.getPoint("potPosition").y,
				x: o.x
			}, 500)
			.onComplete(this.onInAnimationComplete.bind(this))
			.start();
	}

	/**
	 * In animation complete.
	 * @method onInAnimationComplete
	 */
	onInAnimationComplete() {
		this.setValue(0);

		this.position.x = this.targetPosition.x;
		this.position.y = this.targetPosition.y;

		this.emit("animationDone", this);
	}

	/**
	 * Animate out.
	 * @method animateOut
	 */
	animateOut() {
		this.position.y = this.resources.getPoint("potPosition").y;

		switch (this.align) {
			case "left":
			case "L":
				this.position.x = this.resources.getPoint("potPosition").x - this.width / 2;
				break;

			case "center":
			case "C":
				this.position.x = this.resources.getPoint("potPosition").x;
				break;

			case "right":
			case "R":
				this.position.x = this.resources.getPoint("potPosition").x + this.width / 2;
				break;

			default:
				throw new Error("unknown align: " + this.align);
				break;
		}

		var o = {
			x: this.targetPosition.x,
			y: this.targetPosition.y
		};

		this.tween = new TWEEN.Tween(this)
			.to(o, 500)
			.onComplete(this.onOutAnimationComplete.bind(this))
			.start();
	}

	/**
	 * Out animation complete.
	 * @method onOutAnimationComplete
	 */
	onOutAnimationComplete() {

		this.tween = new TWEEN.Tween({
				x: 0
			})
			.to({
				x: 10
			}, 500)
			.onComplete(this.onOutWaitAnimationComplete.bind(this))
			.start();

		this.position.x = this.targetPosition.x;
		this.position.y = this.targetPosition.y;

	}

	/**
	 * Out wait animation complete.
	 * @method onOutWaitAnimationComplete
	 */
	onOutWaitAnimationComplete() {

		this.setValue(0);

		this.emit("animationDone", this);
	}
}

module.exports = ChipsView;