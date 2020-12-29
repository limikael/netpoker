/**
 * Utilities.
 * @module utils
 */

const TWEEN = require('@tweenjs/tween.js');

/**
 * Slider. This is the class for the slider.
 * @class Slider
 */
class Slider extends PIXI.Container {
	constructor(background, knob) {
		super();
		this.background = background;
		this.knob = knob;

		this.addChild(this.background);
		this.addChild(this.knob);


		this.knob.buttonMode = true;
		this.knob.interactive = true;
		this.knob.mousedown = this.onKnobMouseDown.bind(this);

		this.background.buttonMode = true;
		this.background.interactive = true;
		this.background.mousedown = this.onBackgroundMouseDown.bind(this);

		this.fadeTween = null;
		this.alpha = 0;
	}

	/**
	 * Mouse down on knob.
	 * @method onKnobMouseDown
	 */
	onKnobMouseDown(interaction_object) {
		this.downPos = this.knob.position.x;
		this.downX = interaction_object.getLocalPosition(this).x;

		this.stage.mouseup = this.onStageMouseUp.bind(this);
		this.stage.mousemove = this.onStageMouseMove.bind(this);
	}

	/**
	 * Mouse down on background.
	 * @method onBackgroundMouseDown
	 */
	onBackgroundMouseDown(interaction_object) {
		this.downX = interaction_object.getLocalPosition(this).x;
		this.knob.x = interaction_object.getLocalPosition(this).x - this.knob.width*0.5;

		this.validateValue();

		this.downPos = this.knob.position.x;

		this.stage.mouseup = this.onStageMouseUp.bind(this);
		this.stage.mousemove = this.onStageMouseMove.bind(this);

		this.dispatchEvent("change");
	}

	/**
	 * Mouse up.
	 * @method onStageMouseUp
	 */
	onStageMouseUp(interaction_object) {
		this.stage.mouseup = null;
		this.stage.mousemove = null;
	}

	/**
	 * Mouse move.
	 * @method onStageMouseMove
	 */
	onStageMouseMove(interaction_object) {
		this.knob.x = this.downPos + (interaction_object.getLocalPosition(this).x - this.downX);

		this.validateValue();

		this.dispatchEvent("change");
	}

	/**
	 * Validate position.
	 * @method validateValue
	 */
	validateValue() {

		if(this.knob.x < 0)
			this.knob.x = 0;

		if(this.knob.x > (this.background.width - this.knob.width))
			this.knob.x = this.background.width - this.knob.width;
	}

	/**
	 * Get value.
	 * @method getValue
	 */
	getValue() {
		var fraction = this.knob.position.x/(this.background.width - this.knob.width);

		return fraction;
	}

	/**
	 * Get value.
	 * @method getValue
	 */
	setValue(value) {
		this.knob.x = this.background.position.x + value*(this.background.width - this.knob.width);

		this.validateValue();
		return this.getValue();
	}

	/**
	 * Show.
	 * @method show
	 */
	show() {
		this.visible = true;
		if(this.fadeTween != null)
			this.fadeTween.stop();
		this.fadeTween = new TWEEN.Tween(this)
				.to({alpha: 1}, 250)
				.start();
	}

	/**
	 * Hide.
	 * @method hide
	 */
	hide() {
		if(this.fadeTween != null)
			this.fadeTween.stop();
		this.fadeTween = new TWEEN.Tween(this)
				.to({alpha: 0}, 250)
				.onComplete(this.onHidden.bind(this))
				.start();
	}

	/**
	 * On hidden.
	 * @method onHidden
	 */
	onHidden() {
		this.visible = false;
	}
}

module.exports = Slider;
