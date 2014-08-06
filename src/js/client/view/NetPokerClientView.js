var PIXI = require("pixi");
var FunctionUtil = require("../../utils/FunctionUtil");
var Resources = require("../resources/Resources");
var SeatView = require("./SeatView");

/**
 * Net poker client view.
 * @class NetPokerClientView
 */
function NetPokerClientView() {
	var i;

	PIXI.DisplayObjectContainer.call(this);

	this.tableContainer = new PIXI.DisplayObjectContainer();
	this.addChild(this.tableContainer);

	this.tableContainer.addChild(Resources.getInstance().tableBackground);

	this.seatViews = [];

	for (i = 0; i < Resources.getInstance().seatPositions.length; i++) {
		var seatView = new SeatView(i);

		this.tableContainer.addChild(seatView);
		this.seatViews.push(seatView);
	}
}

FunctionUtil.extend(NetPokerClientView, PIXI.DisplayObjectContainer);

module.exports = NetPokerClientView;