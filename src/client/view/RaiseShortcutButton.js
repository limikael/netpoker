/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var TWEEN = require("tween.js");
var Button = require("../../utils/Button");
var NineSlice = require("../../utils/NineSlice");
var Resources = require("resource-fiddle");
var EventDispatcher = require("yaed");
var Checkbox = require("../../utils/Checkbox");
var inherits = require("inherits");

/**
 * Raise shortcut button
 * @class RaiseShortcutButton
 */
function RaiseShortcutButton(resources) {
	var background = new NineSlice(resources.getTexture("buttonBackground"), 10, 5, 10, 5);
	background.setLocalSize(105, 25);
	Button.call(this, background);

	var styleObject = {
		width: 105,
		height: 20,
		font: "bold 14px Arial",
		color: "white"
	};
	this.label = new PIXI.Text("", styleObject);
	this.label.position.x = 8;
	this.label.position.y = 4;
	this.addChild(this.label);
}

inherits(RaiseShortcutButton, Button);
EventDispatcher.init(RaiseShortcutButton);

/**
 * Setter.
 * @method setText
 */
RaiseShortcutButton.prototype.setText = function(string) {
	this.label.setText(string);
	return string;
}

/**
 * Set enabled.
 * @method setEnabled
 */
RaiseShortcutButton.prototype.setEnabled = function(value) {
	if (value) {
		this.alpha = 1;
		this.interactive = true;
		this.buttonMode = true;
	} else {
		this.alpha = 0.5;
		this.interactive = false;
		this.buttonMode = false;
	}
	return value;
}

module.exports = RaiseShortcutButton;