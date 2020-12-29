/**
 * Client.
 * @module client
 */

const Button = require("../../utils/Button");

/**
 * Big button.
 * @class BigButton
 */
class BigButton extends Button {
	constructor(client) {
		super();

		this.resources = client.getResources();
		this.bigButtonTexture = this.resources.getTexture("bigButton");
		this.addChild(new PIXI.Sprite(this.bigButtonTexture));

		var style = {
			fontFamily: "Arial",
			fontSize: 18,
			fontWeight: "bold"
		};

		this.labelField = new PIXI.Text("[button]", style);
		this.labelField.position.y = 30;
		this.addChild(this.labelField);

		var style = {
			fontFamily: "Arial",
			fontSize: 14,
			fontWeight: "bold"
		};

		this.valueField = new PIXI.Text("[value]", style);
		this.valueField.position.y = 50;
		this.addChild(this.valueField);

		this.setLabel("TEST");
		this.setValue(123);
	}

	/**
	 * Set label for the button.
	 * @method setLabel
	 */
	setLabel(label) {
		this.labelField.text=label;
		this.labelField.x = this.bigButtonTexture.width / 2 - this.labelField.width / 2;
	}

	/**
	 * Set value.
	 * @method setValue
	 */
	setValue(value) {
		if (!value) {
			this.valueField.visible = false;
			value = "";
		} else {
			this.valueField.visible = true;
		}

		this.valueField.text=value;
		this.valueField.x = this.bigButtonTexture.width / 2 - this.valueField.width / 2;
	}
}

module.exports = BigButton;