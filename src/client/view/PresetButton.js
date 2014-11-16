/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var TWEEN = require("tween.js");
var Resources = require("resource-fiddle");
var EventDispatcher = require("yaed");
var Checkbox = require("../../utils/Checkbox");
var ButtonData = require("../../proto/data/ButtonData");
var inherits = require("inherits");

/**
 * A pot view
 * @class PresetButton
 */
function PresetButton(resources) {
	PIXI.DisplayObjectContainer.call(this);
	
	this.resources = resources;

	this.id = null;
	this.visible = false;
	this.value = 0;

	var b = new PIXI.Sprite(this.resources.getTexture("checkboxBackground"));
	var t = new PIXI.Sprite(this.resources.getTexture("checkboxTick"));
	t.x = 1;

	this.checkbox = new Checkbox(b,t);
	this.checkbox.addEventListener("change", this.onCheckboxChange, this);
	this.addChild(this.checkbox);

	var styleObject = {
		font: "bold 12px Arial",
		wordWrap: true,
		wordWrapWidth: 250,
		fill: "white"
	};

	this.labelField = new PIXI.Text("", styleObject);
	this.labelField.position.x = 25;

	this.addChild(this.labelField);
}

inherits(PresetButton, PIXI.DisplayObjectContainer);
EventDispatcher.init(PresetButton);


PresetButton.CHANGE = "change";

/**
 * Preset button change.
 * @method onPresetButtonChange
 */
PresetButton.prototype.onCheckboxChange = function() {
	this.dispatchEvent(PresetButton.CHANGE);
}

/**
 * Set label.
 * @method setLabel
 */
PresetButton.prototype.setLabel = function(label) {
	this.labelField.setText(label);
	return label;
}

/**
 * Show.
 * @method show
 */
PresetButton.prototype.show = function(id, value) {
	this.id = id;
	this.value = value;

	if(this.value > 0)
		this.setLabel(ButtonData.getButtonStringForId(id)+" ("+this.value+")");

	else
		this.setLabel(ButtonData.getButtonStringForId(id));

	this.visible = true;
}

/**
 * Hide.
 * @method hide
 */
PresetButton.prototype.hide = function() {
	this.id = null;
	this.visible = false;
	this.value = 0;
	this.setChecked(false);
}

/**
 * Get checked.
 * @method getChecked
 */
PresetButton.prototype.getChecked = function() {
	return this.checkbox.getChecked();
}

/**
 * Set checked.
 * @method setChecked
 */
PresetButton.prototype.setChecked = function(b) {
	this.checkbox.setChecked(b);

	return this.checkbox.getChecked();
}

/**
 * Get value.
 * @method getValue
 */
PresetButton.prototype.getValue = function() {
	return this.value;
}

module.exports = PresetButton;