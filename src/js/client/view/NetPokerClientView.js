var PIXI = require("pixi.js");
var FunctionUtil = require("../../utils/FunctionUtil");
var Resources = require("../resources/Resources");
var SeatView = require("./SeatView");
var CardView = require("./CardView");
var Point = require("../../utils/Point");
var Gradient = require("../../utils/Gradient");

/**
 * Net poker client view.
 * @class NetPokerClientView
 */
function NetPokerClientView() {
	var i;

	PIXI.DisplayObjectContainer.call(this);

	this.setupBackground();

	this.tableContainer = new PIXI.DisplayObjectContainer();
	this.addChild(this.tableContainer);

	this.tableContainer.addChild(Resources.getInstance().tableBackground);

	this.setupSeats();
	this.setupCommunityCards();
}

FunctionUtil.extend(NetPokerClientView, PIXI.DisplayObjectContainer);

/**
 * Setup background.
 */
NetPokerClientView.prototype.setupBackground = function() {
	var gradient = new Gradient();
	gradient.setSize(100, 100);
	gradient.addColorStop(0, "#606060");
	gradient.addColorStop(.5, "#a0a0a0");
	gradient.addColorStop(1, "#909090");

	var s = gradient.createSprite();
	s.width = 960;
	s.height = 720;
	this.addChild(s);

	var s = new PIXI.Sprite(Resources.getInstance().dividerLine);
	s.x = 345;
	s.y = 540;
	this.addChild(s);

	var s = new PIXI.Sprite(Resources.getInstance().dividerLine);
	s.x = 693;
	s.y = 540;
	this.addChild(s);
}

/**
 * Setup seats.
 */
NetPokerClientView.prototype.setupSeats = function() {
	var i, j;
	var pocketCards;

	this.seatViews = [];

	for (i = 0; i < Resources.getInstance().seatPositions.length; i++) {
		var seatView = new SeatView(i);
		var p = seatView.position;

		for (j = 0; j < 2; j++) {
			var c = new CardView();
			c.hide();
			c.setTargetPosition(Point(p.x + j * 30 - 60, p.y - 100));
			this.tableContainer.addChild(c);
			seatView.addPocketCard(c);
		}

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