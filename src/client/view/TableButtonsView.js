/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var inherits = require("inherits");
var EventDispatcher = require("yaed");
var SelectTableButton = require("./SelectTableButton");
var Button = require("../../utils/Button");

/**
 * Select table during tournament.
 * @class TableButtonsView
 */
function TableButtonsView(viewConfig) {
	PIXI.DisplayObjectContainer.call(this);

	this.viewConfig = viewConfig;

	this.holder = new PIXI.DisplayObjectContainer();
	this.addChild(this.holder);

	this.buttons = [];
	this.holder.y = 10;
}

inherits(TableButtonsView, PIXI.DisplayObjectContainer);
EventDispatcher.init(TableButtonsView);

TableButtonsView.TABLE_CLICK = "tableClick";

/**
 * Show buttons.
 * @method showButtons
 */
TableButtonsView.prototype.showButtons = function(enabled, currentIndex) {
	for (var b = 0; b < this.buttons.length; b++)
		this.holder.removeChild(this.buttons[b]);

	this.buttons = [];

	for (var i = 0; i < enabled.length; i++) {
		var button = new SelectTableButton(this.viewConfig);
		button.on(Button.CLICK, this.onButtonClick, this);
		button.x = (i % 4) * 40;
		button.y = Math.floor(i / 4) * 24;
		button.setEnabled(enabled[i]);
		button.setTableIndex(i);
		this.buttons.push(button);
		this.holder.addChild(button);
	}

	this.holder.x = 960 - 10 - this.holder.width;
}

/**
 * Clear.
 * @method clear
 */
TableButtonsView.prototype.clear = function() {
	for (var b = 0; b < this.buttons.length; b++)
		this.holder.removeChild(this.buttons[b]);

	this.buttons = [];
}

/**
 * Button click.
 * @method onButtonClick
 */
TableButtonsView.prototype.onButtonClick = function(ev) {
	var index = this.buttons.indexOf(ev.target);

	this.trigger(TableButtonsView.TABLE_CLICK, index);
}

module.exports = TableButtonsView;