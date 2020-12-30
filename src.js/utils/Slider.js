/**
 * Utilities.
 * @module utils
 */

const PixiUtil=require("./PixiUtil.js");

/*
 * Make it logaritmic:
 * https://stackoverflow.com/questions/846221/logarithmic-slider
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
		this.knob.on("mousedown",this.onKnobMouseDown);

		this.background.buttonMode = true;
		this.background.interactive = true;
		this.background.on("mousedown",this.onBackgroundMouseDown);
	}

	/**
	 * Mouse down on knob.
	 * @method onKnobMouseDown
	 */
	onKnobMouseDown=(e)=>{
		this.downPos = this.knob.position.x;
		this.downX = this.toLocal(e.data.global).x;

		this.stage=PixiUtil.findTopParent(this);
		this.stage.interactive=true;
		this.stage.on("mouseup",this.onStageMouseUp);
		this.stage.on("mousemove",this.onStageMouseMove);
	}

	/**
	 * Mouse down on background.
	 * @method onBackgroundMouseDown
	 */
	onBackgroundMouseDown=(e)=>{
		let x=this.toLocal(e.data.global).x;
		this.downX=x;
		this.knob.x=x-this.knob.width/2;

		this.validateValue();

		this.downPos = this.knob.position.x;

		this.stage=PixiUtil.findTopParent(this);
		this.stage.interactive=true;
		this.stage.on("mouseup",this.onStageMouseUp);
		this.stage.on("mousemove",this.onStageMouseMove);

		this.emit("change");
	}

	/**
	 * Mouse up.
	 * @method onStageMouseUp
	 */
	onStageMouseUp=(e)=>{
		this.stage.interactive=false;
		this.stage.off("mouseup",this.onStageMouseUp);
		this.stage.off("mousemove",this.onStageMouseMove);
	}

	/**
	 * Mouse move.
	 * @method onStageMouseMove
	 */
	onStageMouseMove=(e)=>{
		let x=this.toLocal(e.data.global).x;
		this.knob.x = this.downPos + (x - this.downX);

		this.validateValue();

		this.emit("change");
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
}

module.exports = Slider;
