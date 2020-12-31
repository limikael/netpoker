/**
 * Utilities.
 * @module utils
 */

var Button = require("./Button");

/**
 * Checkbox.
 * @class Checkbox
 */
class Checkbox extends PIXI.Container {
	constructor(background, tick) {
		super();

		this.button = new Button(background);
		this.addChild(this.button);

		this.check = tick;
		this.addChild(this.check);

		this.button.on("click", this.onButtonClick);

		this.setChecked(false);
	}

	/**
	 * Button click.
	 * @method onButtonClick
	 * @private
	 */
	onButtonClick=()=>{
		this.check.visible = !this.check.visible;

		this.emit("change");
	}

	/**
	 * Setter.
	 * @method setChecked
	 */
	setChecked(value) {
		this.check.visible = value;
		return value;
	}

	/**
	 * Getter.
	 * @method getChecked
	 */
	getChecked() {
		return this.check.visible;
	}
}

module.exports = Checkbox;