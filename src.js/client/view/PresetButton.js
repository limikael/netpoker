/**
 * Client.
 * @module client
 */

const TWEEN = require('@tweenjs/tween.js');
const Checkbox = require("../../utils/Checkbox");

/**
 * A pot view
 * @class PresetButton
 */
class PresetButton extends PIXI.Container {
	constructor(client,index) {
		super();

		this.client=client;
		this.resources=client.getResources();
		this.index=index;

		this.id = null;
		this.visible = false;
		this.value = 0;

		var b = new PIXI.Sprite(this.resources.getTexture("checkboxBackground"));
		var t = new PIXI.Sprite(this.resources.getTexture("checkboxTick"));
		t.x = 1;

		this.checkbox = new Checkbox(b,t);
		this.checkbox.on("change", this.onCheckboxChange);
		this.addChild(this.checkbox);

		var styleObject = {
			fontFamily: "Arial",
			fontSize: 12,
			fontWeight: "bold", 
			wordWrap: true,
			wordWrapWidth: 250,
			fill: "white"
		};

		this.labelField = new PIXI.Text("", styleObject);
		this.labelField.position.x = 25;

		this.addChild(this.labelField);
	}

	/**
	 * Preset button change.
	 * @method onPresetButtonChange
	 */
	onCheckboxChange=()=>{
		this.emit("change",this.index);
	}

	/**
	 * Set label.
	 * @method setLabel
	 */
	setLabel(label) {
		this.labelField.text=label;
		return label;
	}

	/**
	 * Show.
	 * @method show
	 */
	show(id, value) {
		this.id = id;
		this.value = value;

		if(this.value > 0)
			this.setLabel(this.client.translate(id)+" ("+this.value+")");

		else
			this.setLabel(this.client.translate(id));

		this.visible = true;
	}

	/**
	 * Hide.
	 * @method hide
	 */
	hide() {
		this.id = null;
		this.visible = false;
		this.value = 0;
		this.setChecked(false);
	}

	/**
	 * Get checked.
	 * @method getChecked
	 */
	getChecked() {
		return this.checkbox.getChecked();
	}

	/**
	 * Set checked.
	 * @method setChecked
	 */
	setChecked(b) {
		this.checkbox.setChecked(b);

		return this.checkbox.getChecked();
	}

	/**
	 * Get value.
	 * @method getValue
	 */
	getValue() {
		return this.value;
	}
}

module.exports = PresetButton;