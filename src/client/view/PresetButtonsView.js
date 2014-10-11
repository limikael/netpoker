var PIXI = require("pixi.js");
var TWEEN = require("tween.js");
var FunctionUtil = require("../../utils/FunctionUtil");
var Resources = require("../resources/Resources");
var EventDispatcher = require("../../utils/EventDispatcher");
var PresetButton = require("./PresetButton");

/**
 * A pot view
 * @class PresetButtonsView
 * @module client
 */
function PresetButtonsView() {
	PIXI.DisplayObjectContainer.call(this);

	this.buttons = new Array();
	var origin = Resources.getInstance().getPoint("bigButtonPosition");

	for (var i = 0; i < 6; i++) {
		var p = new PresetButton();
		p.addEventListener(PresetButton.CHANGE, this.onPresetButtonChange, this);
		p.x = origin.x + 30 + 140 * (i % 2);
		p.y = origin.y + 35 * Math.floor(i / 2);
		this.addChild(p);
		this.buttons.push(p);
	}

	this.hide();
}

FunctionUtil.extend(PresetButtonsView, PIXI.DisplayObjectContainer);
EventDispatcher.init(PresetButtonsView);

PresetButtonsView.CHANGE = "change";

/**
 * Preset button change.
 * @method onPresetButtonChange
 */
PresetButtonsView.prototype.onPresetButtonChange = function(ev) {

	for (var i = 0; i < this.buttons.length; i++) {
		var b = this.buttons[i];
		if (b != ev.target) {
			b.setChecked(false);
		}
	}

	this.dispatchEvent(PresetButtonsView.CHANGE);
}

/**
 * Hide.
 * @method hide
 */
PresetButtonsView.prototype.hide = function() {
	for (var i = 0; i < this.buttons.length; i++) {
		this.buttons[i].hide();
	}
}

/**
 * Show.
 * @method show
 */
PresetButtonsView.prototype.show = function() {
	this.visible = true;

}

/**
 * Get buttons.
 * @method getButtons
 */
PresetButtonsView.prototype.getButtons = function() {
	return this.buttons;
}

/**
 * Get current preset button.
 * @method getCurrent
 */
PresetButtonsView.prototype.getCurrent = function() {
	for (var i = 0; i < this.buttons.length; i++) {
		if (this.buttons[i].getChecked() == true) {
			return this.buttons[i];
		}
	}
	return null;
}

/**
 * Get current preset button.
 * @method setCurrent
 */
PresetButtonsView.prototype.setCurrent = function(id) {
	for (var i = 0; i < this.buttons.length; i++) {
		var b = this.buttons[i];
		if ((id != null) && (b.id == id)) {
			b.setChecked(true);
		} else {
			b.setChecked(false);
		}
	}
}

module.exports = PresetButtonsView;