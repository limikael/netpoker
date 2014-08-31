var PIXI = require("pixi.js");
var FunctionUtil = require("./FunctionUtil");
var EventDispatcher = require("./EventDispatcher");

/**
 * Button.
 */
function Button(content) {
	PIXI.DisplayObjectContainer.call(this);

	this.addChild(content);

	this.interactive = true;
	this.buttonMode = true;

	this.mouseover = this.onMouseover.bind(this);
	this.mouseout = this.onMouseout.bind(this);
	this.mousedown = this.onMousedown.bind(this);
	this.mouseup = this.onMouseup.bind(this);
	this.click = this.onClick.bind(this);

	this.colorMatrixFilter = new PIXI.ColorMatrixFilter();
	this.colorMatrixFilter.matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

	this.filters = [this.colorMatrixFilter];
}

FunctionUtil.extend(Button, PIXI.DisplayObjectContainer);
EventDispatcher.init(Button);

Button.LIGHT_MATRIX = [1.5, 0, 0, 0, 0, 1.5, 0, 0, 0, 0, 1.5, 0, 0, 0, 0, 1];
Button.DARK_MATRIX = [.75, 0, 0, 0, 0, .75, 0, 0, 0, 0, .75, 0, 0, 0, 0, 1];
Button.DEFAULT_MATRIX = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

Button.CLICK = "click";

/**
 * Mouse over.
 */
Button.prototype.onMouseover = function() {
	this.colorMatrixFilter.matrix = Button.LIGHT_MATRIX;
}

/**
 * Mouse out.
 */
Button.prototype.onMouseout = function() {
	this.colorMatrixFilter.matrix = Button.DEFAULT_MATRIX;
}

/**
 * Mouse down.
 */
Button.prototype.onMousedown = function() {
	this.colorMatrixFilter.matrix = Button.DARK_MATRIX;
}

/**
 * Mouse up.
 */
Button.prototype.onMouseup = function() {
	this.colorMatrixFilter.matrix = Button.LIGHT_MATRIX;
}

/**
 * Click.
 */
Button.prototype.onClick = function() {
	this.trigger(Button.CLICK);
}

module.exports = Button;