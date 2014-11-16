/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var Button = require("../../utils/Button");
var Resources = require("resource-fiddle");
var inherits = require("inherits");

/**
 * Dialog button.
 * @class DialogButton
 */
function DialogButton(resources) {
	Button.call(this);

	this.buttonTexture = resources.getTexture("dialogButton");
	this.addChild(new PIXI.Sprite(this.buttonTexture));

	var style = {
		font: "normal 14px Arial",
		fill: "#ffffff"
	};

	this.textField = new PIXI.Text("[test]", style);
	this.textField.position.y = 15;
	this.addChild(this.textField);

	this.setText("BTN");
}

inherits(DialogButton, Button);

/**
 * Set text for the button.
 * @method setText
 */
DialogButton.prototype.setText = function(text) {
	this.textField.setText(text);
	this.textField.updateTransform();
	this.textField.x = this.buttonTexture.width / 2 - this.textField.width / 2;
}

module.exports = DialogButton;