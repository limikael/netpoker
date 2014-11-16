/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var FunctionUtil = require("../../utils/FunctionUtil");
var EventDispatcher = require("yaed");

/**
 * Show table info.
 * @class TableInfoView
 */
function TableInfoView() {
	PIXI.DisplayObjectContainer.call(this);

	var style = {
		font: "bold 24px Times New Roman",
		fill: "#ffffff",
		dropShadow: true,
		dropShadowColor: "#000000",
		dropShadowDistance: 2,
		stroke: "#000000",
		strokeThickness: 2,
		wordWrap: true,
		wordWrapWidth: 300
	};

	this.tableInfoText = new PIXI.Text("<TableInfoText>", style);
	this.tableInfoText.position.x = 355;
	this.tableInfoText.position.y = 540;
	this.addChild(this.tableInfoText);

	var style={
		font: "bold 12px Arial",
		fill: "#ffffff",
		dropShadow: true,
		dropShadowColor: "#000000",
		dropShadowDistance: 1,
		stroke: "#000000",
		strokeThickness: 1,
	};

	this.handInfoText=new PIXI.Text("<HandInfoText>",style);
	this.handInfoText.position.y=10;
	this.handInfoText.position.x=960-this.handInfoText.width;
	this.addChild(this.handInfoText);
}

FunctionUtil.extend(TableInfoView, PIXI.DisplayObjectContainer);
EventDispatcher.init(TableInfoView);

/**
 * Set table info text.
 * @method setTableInfoText
 */
TableInfoView.prototype.setTableInfoText = function(s) {
	if (!s)
		s="";

	this.tableInfoText.setText(s);
}

/**
 * Set hand info text.
 * @method setTableInfoText
 */
TableInfoView.prototype.setHandInfoText = function(s) {
	if (!s)
		s="";

	this.handInfoText.setText(s);
	this.handInfoText.updateTransform();
	this.handInfoText.position.x=960-this.handInfoText.width-10;
}

/**
 * Clear.
 * @method clear
 */
TableInfoView.prototype.clear = function() {
	this.tableInfoText.setText("");
	this.handInfoText.setText("");
}

module.exports = TableInfoView;