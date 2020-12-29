/**
 * Client.
 * @module client
 */

var Button = require("../../utils/Button");
var Slider = require("../../utils/Slider");
var NineSlice = require("../../utils/NineSlice");
var BigButton = require("./BigButton");
//var RaiseShortcutButton = require("./RaiseShortcutButton");

/**
 * Buttons
 * @class ButtonsView
 */
class ButtonsView extends PIXI.Container {
	constructor(client) {
		super();

		this.client=client;
		this.resources = client.getResources();

		this.buttonHolder = new PIXI.Container();
		this.addChild(this.buttonHolder);

		var sliderBackground = new NineSlice(this.resources.getTexture("sliderBackground"), 20, 0, 20, 0);
		sliderBackground.setLocalSize(300, sliderBackground.height);

		var knob = new PIXI.Sprite(this.resources.getTexture("sliderKnob"));

		this.slider = new Slider(sliderBackground, knob);
		var pos = this.resources.getPoint("bigButtonPosition");
		this.slider.position.x = pos.x;
		this.slider.position.y = pos.y - 35;
		this.slider.on("change", this.onSliderChange);
		this.addChild(this.slider);

		this.buttonHolder.position.x = 366;
		this.buttonHolder.position.y = 575;

		this.buttons = [];

		for (var i = 0; i < 3; i++) {
			var button = new BigButton(this.client);
			button.on("click", this.onButtonClick);
			button.position.x = i * 105;
			this.buttonHolder.addChild(button);
			this.buttons.push(button);
		}

		this.clear();
	}

	/**
	 * Slider change.
	 * @method onSliderChange
	 */
	onSliderChange=()=>{
		let minv = Math.log(this.sliderMin);
		let maxv = Math.log(this.sliderMax);
		let scale=maxv-minv;
		let newValue = Math.round(Math.exp(minv+scale*this.slider.getValue()));

		this.buttons[this.sliderIndex].setValue(newValue);
	}

	/**
	 * Show slider.
	 * @method showSlider
	 */
	showSlider(sliderIndex, sliderMax) {
		this.sliderIndex = sliderIndex;
		this.sliderMin = this.buttons[sliderIndex].getValue();
		this.sliderMax = sliderMax;

		this.slider.setValue(0);
		this.slider.visible = true;
	}

	/**
	 * Clear.
	 * @method clear
	 */
	clear() {
		this.showButtons([]);
		this.slider.visible = false;
	}

	/**
	 * Set button datas.
	 * @method setButtons
	 */
	showButtons(buttons, values) {
		for (var i = 0; i < this.buttons.length; i++) {
			var button = this.buttons[i];
			if (i >= buttons.length) {
				button.visible = false;
				continue;
			}

			button.visible = true;
			button.setLabel(buttons[i]);
			button.setValue(values[i]);
		}

		this.buttonHolder.position.x = 366;
		if (buttons.length < 3)
			this.buttonHolder.position.x += 45;
	}

	/**
	 * Button click.
	 * @method onButtonClick
	 * @private
	 */
	onButtonClick=(e)=>{
		var buttonIndex = -1;
		let button;

		for (var i = 0; i < this.buttons.length; i++) {
			this.buttons[i].visible = false;
			if (e.target == this.buttons[i])
				button=this.buttons[i];
		}

		this.slider.visible = false;
		this.emit("buttonClick",button.getLabel(),button.getValue());
	}
}

module.exports = ButtonsView;