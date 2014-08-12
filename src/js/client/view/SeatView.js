var PIXI = require("pixi");
var FunctionUtil = require("../../utils/FunctionUtil");
var Resources = require("../resources/Resources");

/**
 * A seat view.
 * @class SeatView
 */
function SeatView(seatIndex) {
	PIXI.DisplayObjectContainer.call(this);

	this.seatIndex = seatIndex;

	var seatTexture = Resources.getInstance().seatPlate;
	var seatSprite = new PIXI.Sprite(seatTexture);

	seatSprite.position.x = -seatTexture.width / 2;
	seatSprite.position.y = -seatTexture.height / 2;

	this.addChild(seatSprite);

	var pos = Resources.getInstance().seatPositions[this.seatIndex];

	this.position.x = pos.x;
	this.position.y = pos.y;

	var style;

	style = {
		font: "bold 20px Arial"
	};

	this.nameField = new PIXI.Text("[name]", style);
	this.nameField.position.y = -20;
	this.addChild(this.nameField);

	style = {
		font: "normal 12px Arial"
	};

	this.chipsField = new PIXI.Text("[name]", style);
	this.chipsField.position.y = 5;
	this.addChild(this.chipsField);

	this.setName("");
	this.setChips("");
}

FunctionUtil.extend(SeatView, PIXI.DisplayObjectContainer);

/**
 * Set name.
 */
SeatView.prototype.setName = function(name) {
	this.nameField.setText(name);
	this.nameField.updateTransform();

	this.nameField.position.x = -this.nameField.canvas.width / 2;
}

/**
 * Set name.
 */
SeatView.prototype.setChips = function(chips) {
	this.chipsField.setText(chips);
	this.chipsField.updateTransform();

	this.chipsField.position.x = -this.chipsField.canvas.width / 2;
}

/**
 * Set sitout.
 */
SeatView.prototype.setSitout = function(sitout) {
	if (sitout)
		this.alpha=.5;

	else
		this.alpha=1;
}

/**
 * Set sitout.
 */
SeatView.prototype.setActive = function(active) {
	this.visible=active;
}

module.exports = SeatView;