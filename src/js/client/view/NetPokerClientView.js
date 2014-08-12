var PIXI = require("pixi");
var FunctionUtil = require("../../utils/FunctionUtil");
var Resources = require("../resources/Resources");
var SeatView = require("./SeatView");
var CardView = require("./CardView");
var Point = require("../../utils/Point");

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

	this.setupSeats();
	this.setupCommunityCards();
}

FunctionUtil.extend(NetPokerClientView, PIXI.DisplayObjectContainer);

/**
 * Setup seats.
 */
NetPokerClientView.prototype.setupSeats = function() {
	this.seatViews = [];

	for (i = 0; i < Resources.getInstance().seatPositions.length; i++) {
		var seatView = new SeatView(i);

		this.tableContainer.addChild(seatView);
		this.seatViews.push(seatView);
	}
}

/**
 * Setup community cards.
 */
NetPokerClientView.prototype.setupCommunityCards = function() {
	this.communityCards = [];

	var p = Resources.getInstance().communityCardsPosition;

	for (i = 0; i < 5; i++) {
		var cardView = new CardView();
		cardView.setTargetPosition(Point(p.x + i * 90, p.y));

		this.communityCards.push(cardView);
		this.tableContainer.addChild(cardView);
	}
}

/**
 * Get seat view by index.
 * @method getSeatViewByIndex
 */
NetPokerClientView.prototype.getSeatViewByIndex = function(index) {
	return this.seatViews[index];
}

/**
 * Get seat view by index.
 * @method getSeatViewByIndex
 */
NetPokerClientView.prototype.getCommunityCards = function() {
	return this.communityCards;
}

module.exports = NetPokerClientView;