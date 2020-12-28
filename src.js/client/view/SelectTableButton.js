/**
 * Client.
 * @module client
 */

var Button = require("../../utils/Button");
var inherits = require("inherits");
var PIXI = require("pixi.js");

/**
 * Select table button.
 * @class SelectTableButton
 */
function SelectTableButton(viewConfig) {
	this.resources = viewConfig.getResources();

	Button.call(this);

	this.background = new PIXI.Sprite(this.resources.getTexture("selectTableButton"));
	this.addChild(this.background);

	this.selectedBackground = new PIXI.Sprite(this.resources.getTexture("selectedTableButton"));
	this.addChild(this.selectedBackground);


	var style = {
		font: "bold 12px Times New Roman",
		fill: "#ffffff",
	};

	this.indexField = new PIXI.Text("1", style);
	this.indexField.y = 4;
	this.addChild(this.indexField);
	this.setTableIndex(0);

	this.eleminatedIcon = new PIXI.Sprite(this.resources.getTexture("eleminatedTableIcon"));
	this.eleminatedIcon.x = this.width / 2 - this.eleminatedIcon.width / 2;
	this.eleminatedIcon.y = this.height / 2 - this.eleminatedIcon.height / 2;
	this.addChild(this.eleminatedIcon);

	this.setCurrent(false);

}

inherits(SelectTableButton, Button);

/**
 * Set table index.
 * @method setTableIndex
 */
SelectTableButton.prototype.setTableIndex = function(index) {
	this.indexField.setText(index + 1);
	this.indexField.x = 20 - this.indexField.width / 2;
}

/**
 * Set enabled.
 * @method setEnabled
 */
SelectTableButton.prototype.setEnabled = function(enabled) {
	Button.prototype.setEnabled.call(this, enabled);

	this.eleminatedIcon.visible = !enabled;

	this.alpha = enabled ? 1 : .5;
}

/**
 * Set current.
 * @method setEnabled
 */
SelectTableButton.prototype.setCurrent = function(current) {
	this.selectedBackground.visible = current;
}

module.exports = SelectTableButton;