/**
 * Client.
 * @module client
 */

const TWEEN = require('@tweenjs/tween.js');
const Button = require("../../utils/Button");
const NineSlice = require("../../utils/NineSlice");
const Checkbox = require("../../utils/Checkbox");

/**
 * Checkboxes view
 * @class SettingsCheckbox
 */
class SettingsCheckbox extends PIXI.Container {
	constructor(client, id, string) {
		super();

		this.resources = client.getResources();
		this.id = id;

		var y = 0;

		var styleObject = {
			width: 200,
			height: 25,
			fontFamily: "Arial",
			fontSize: 13,
			fontWeight: "bold",
			fill: "white"
		};
		this.label = new PIXI.Text(string, styleObject);
		this.label.position.x = 25;
		this.label.position.y = y + 1;
		this.addChild(this.label);

		var background = new PIXI.Sprite(this.resources.getTexture("checkboxBackground"));
		var tick = new PIXI.Sprite(this.resources.getTexture("checkboxTick"));
		tick.x = 1;

		this.checkbox = new Checkbox(background, tick);
		this.checkbox.position.y = y;
		this.addChild(this.checkbox);

		this.checkbox.on("change", this.onCheckboxChange, this);
	}

	/**
	 * Checkbox change.
	 * @method onCheckboxChange
	 */
	onCheckboxChange=()=>{
		this.emit("change", this);
	}

	/**
	 * Getter.
	 * @method getChecked
	 */
	getChecked() {
		return this.checkbox.getChecked();
	}

	/**
	 * Setter.
	 * @method setChecked
	 */
	setChecked(checked) {
		this.checkbox.setChecked(checked);
		return checked;
	}
}

module.exports = SettingsCheckbox;