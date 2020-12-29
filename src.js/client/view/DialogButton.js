/**
 * Client.
 * @module client
 */

var Button = require("../../utils/Button");

/**
 * Dialog button.
 * @class DialogButton
 */
class DialogButton extends Button {
	constructor(client) {
		super();

		this.resources=client.getResources();
		this.buttonTexture = this.resources.getTexture("dialogButton");
		this.addChild(new PIXI.Sprite(this.buttonTexture));

		var style = {
			fontFamily: "Arial",
			fontSize: 14,
			fontWeight: "normal",
			fill: "#ffffff"
		};

		this.textField = new PIXI.Text("[test]", style);
		this.textField.position.y = 15;
		this.addChild(this.textField);

		this.setText("BTN");
	}


	/**
	 * Set text for the button.
	 * @method setText
	 */
	setText(text) {
		this.textField.text=text;
		this.textField.x = this.buttonTexture.width / 2 - this.textField.width / 2;
	}
}

module.exports = DialogButton;