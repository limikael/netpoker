var PIXI = require("pixi.js");
var FunctionUtil = require("../../utils/FunctionUtil");
var BigButton = require("./BigButton");

/**
 * Buttons
 */
function ButtonsView() {
	PIXI.DisplayObjectContainer.call(this);

	this.buttonHolder = new PIXI.DisplayObjectContainer();
	this.addChild(this.buttonHolder);

	this.buttonHolder.position.x = 366;
	this.buttonHolder.position.y = 575;

	this.buttons = [];

	for (var i = 0; i < 3; i++) {
		var button = new BigButton();
		button.position.x = i * 105;
		this.buttonHolder.addChild(button);
		this.buttons.push(button);
	}
}

FunctionUtil.extend(ButtonsView, PIXI.DisplayObjectContainer);

module.exports = ButtonsView;