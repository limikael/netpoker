var PIXI = require("pixi.js");
var FunctionUtil = require("../../utils/FunctionUtil");
var Button = require("../../utils/Button");
var Resources = require("../resources/Resources");

/**
 * Big button.
 */
function BigButton() {
	Button.call(this);

	this.addChild(new PIXI.Sprite(Resources.getInstance().bigButton));
}

FunctionUtil.extend(BigButton, Button);

module.exports = BigButton;