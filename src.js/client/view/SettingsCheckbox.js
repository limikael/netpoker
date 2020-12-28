/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var TWEEN = require("tween.js");
var Button = require("../../utils/Button");
var NineSlice = require("../../utils/NineSlice");
var EventDispatcher = require("yaed");
var Checkbox = require("../../utils/Checkbox");
var inherits = require("inherits");

/**
 * Checkboxes view
 * @class SettingsCheckbox
 */
function SettingsCheckbox(resources, id, string) {
 	PIXI.DisplayObjectContainer.call(this);

 	this.resources = resources;
 	this.id = id;

 	var y = 0;

 	var styleObject = {
 		width: 200,
 		height: 25,
 		font: "bold 13px Arial",
 		color: "white"
 	};
 	this.label = new PIXI.Text(string, styleObject);
 	this.label.position.x = 25;
 	this.label.position.y = y + 1;
 	this.addChild(this.label);

 	var background = new PIXI.Sprite(this.resources.getTexture("checkboxBackground"));
 	var tick = new PIXI.Sprite(this.resources.getTexture("checkboxTick"));
 	tick.x = 1;

 	this.checkbox = new Checkbox(background, tick);
 	this.checkbox.position.y = y;
 	this.addChild(this.checkbox);

 	this.checkbox.addEventListener("change", this.onCheckboxChange, this);
}

inherits(SettingsCheckbox, PIXI.DisplayObjectContainer);
EventDispatcher.init(SettingsCheckbox);

/**
 * Checkbox change.
 * @method onCheckboxChange
 */
SettingsCheckbox.prototype.onCheckboxChange = function(interaction_object) {
	this.dispatchEvent("change", this);
}

/**
 * Getter.
 * @method getChecked
 */
SettingsCheckbox.prototype.getChecked = function() {
	return this.checkbox.getChecked();
}

/**
 * Setter.
 * @method setChecked
 */
SettingsCheckbox.prototype.setChecked = function(checked) {
	this.checkbox.setChecked(checked);
	return checked;
}

module.exports = SettingsCheckbox;