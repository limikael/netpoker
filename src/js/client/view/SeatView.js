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
}

FunctionUtil.extend(SeatView, PIXI.DisplayObjectContainer);

module.exports = SeatView;