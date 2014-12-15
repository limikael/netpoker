/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var EventDispatcher = require("yaed");
var Resources = require("resource-fiddle");
var SeatView = require("./SeatView");
var CardView = require("./CardView");
var ChatView = require("./ChatView");
var Point = require("../../utils/Point");
var Gradient = require("../../utils/Gradient");
var ButtonsView = require("./ButtonsView");
var DialogView = require("./DialogView");
var DealerButtonView = require("./DealerButtonView");
var ChipsView = require("./ChipsView");
var PotView = require("./PotView");
var TimerView = require("./TimerView");
var SettingsView = require("../view/SettingsView");
var TableInfoView = require("../view/TableInfoView");
var PresetButtonsView = require("../view/PresetButtonsView");
var inherits = require("inherits");

/**
 * Net poker client view.
 * @class NetPokerClientView
 */
function NetPokerClientView(viewConfig, resources) {
	PIXI.DisplayObjectContainer.call(this);

	this.viewConfig = viewConfig;
	this.resources = resources;
	this.setupBackground();

	this.tableContainer = new PIXI.DisplayObjectContainer();
	this.addChild(this.tableContainer);

	this.tableBackground = new PIXI.Sprite(this.resources.getTexture("tableBackground"));
	this.tableContainer.addChild(this.tableBackground);
	this.tableBackground.position.x = this.resources.getPoint("tablePosition").x;
	this.tableBackground.position.y = this.resources.getPoint("tablePosition").y;

	this.setupSeats();
	this.setupCommunityCards();

	this.timerView = new TimerView(this.viewConfig, this.resources);
	this.tableContainer.addChild(this.timerView);

	this.chatView = new ChatView(this.viewConfig, this.resources);
	this.addChild(this.chatView);

	this.buttonsView = new ButtonsView(this.viewConfig, this.resources);
	this.addChild(this.buttonsView);

	this.dealerButtonView = new DealerButtonView(this.viewConfig, this.resources);
	this.addChild(this.dealerButtonView);

	this.tableInfoView = new TableInfoView(this.viewConfig, this.resources);
	this.addChild(this.tableInfoView);

	this.potView = new PotView(this.viewConfig, this.resources);
	this.addChild(this.potView);
	this.potView.position.x = this.resources.getPoint("potPosition").x;
	this.potView.position.y = this.resources.getPoint("potPosition").y;

	this.settingsView = new SettingsView(this.viewConfig, this.resources);
	this.addChild(this.settingsView);

	this.dialogView = new DialogView(this.viewConfig, this.resources);
	this.addChild(this.dialogView);

	this.presetButtonsView = new PresetButtonsView(this.viewConfig, this.resources);
	this.addChild(this.presetButtonsView);

	this.setupChips();
}

inherits(NetPokerClientView, PIXI.DisplayObjectContainer);
EventDispatcher.init(NetPokerClientView);

NetPokerClientView.SEAT_CLICK = "seatClick";

/**
 * Setup background.
 * @method setupBackground
 */
NetPokerClientView.prototype.setupBackground = function() {
	var g = new PIXI.Graphics();
	g.beginFill(0x05391d, 1);
	g.drawRect(-1000, 0, 960 + 2000, 720);
	g.endFill();
	this.addChild(g);

	var g = new PIXI.Graphics();
	g.beginFill(0x909090, 1);
	g.drawRect(-1000, 720, 960 + 2000, 1000);
	g.endFill();
	this.addChild(g);

	var gradient = new Gradient();
	gradient.setSize(100, 100);
	gradient.addColorStop(0, "#606060");
	gradient.addColorStop(.05, "#a0a0a0");
	gradient.addColorStop(1, "#909090");

	var s = gradient.createSprite();
	s.position.y = 530;
	s.position.x = -1000;
	s.width = 960 + 2000;
	s.height = 190;
	this.addChild(s);

	var s = new PIXI.Sprite(this.resources.getTexture("dividerLine"));
	s.x = 345;
	s.y = 540;
	this.addChild(s);

	var s = new PIXI.Sprite(this.resources.getTexture("dividerLine"));
	s.x = 693;
	s.y = 540;
	this.addChild(s);
}

/**
 * Setup seats.
 * @method serupSeats
 */
NetPokerClientView.prototype.setupSeats = function() {
	var i, j;
	var pocketCards;

	this.seatViews = [];

	for (i = 0; i < 10; i++) {
		var seatView = new SeatView(this.resources, i);
		var p = seatView.position;

		for (j = 0; j < 2; j++) {
			var c = new CardView(this.viewConfig, this.resources);
			c.hide();
			c.setTargetPosition(Point(p.x + j * 30 - 60, p.y - 100));
			this.tableContainer.addChild(c);
			seatView.addPocketCard(c);
			seatView.on("click", this.onSeatClick, this);
		}

		this.tableContainer.addChild(seatView);
		this.seatViews.push(seatView);
	}
}

/**
 * Setup chips.
 * @method serupSeats
 */
NetPokerClientView.prototype.setupChips = function() {
	var i;
	for (i = 0; i < 10; i++) {
		var chipsView = new ChipsView(this.viewConfig, this.resources);
		this.seatViews[i].setBetChipsView(chipsView);

		chipsView.setAlignment(this.resources.getValue("betAlign")[i]);
		chipsView.setTargetPosition(this.resources.getPoint("betPosition"+i));
		this.tableContainer.addChild(chipsView);
	}
}

/**
 * Seat click.
 * @method onSeatClick
 * @private
 */
NetPokerClientView.prototype.onSeatClick = function(e) {
	var seatIndex = -1;

	for (var i = 0; i < this.seatViews.length; i++)
		if (e.target == this.seatViews[i])
			seatIndex = i;

	console.log("seat click: " + seatIndex);
	this.trigger({
		type: NetPokerClientView.SEAT_CLICK,
		seatIndex: seatIndex
	});
}

/**
 * Setup community cards.
 * @method setupCommunityCards
 * @private
 */
NetPokerClientView.prototype.setupCommunityCards = function() {
	this.communityCards = [];

	var p = this.resources.getPoint("communityCardsPosition");

	for (i = 0; i < 5; i++) {
		var cardView = new CardView(this.viewConfig, this.resources);
		cardView.hide();
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
 * Get community cards.
 * @method getCommunityCards
 */
NetPokerClientView.prototype.getCommunityCards = function() {
	return this.communityCards;
}

/**
 * Get buttons view.
 * @method getButtonsView
 */
NetPokerClientView.prototype.getButtonsView = function() {
	return this.buttonsView;
}

/**
 * Get preset buttons view.
 * @method presetButtonsView
 */
NetPokerClientView.prototype.getPresetButtonsView = function() {
	return this.presetButtonsView;
}

/**
 * Get dialog view.
 * @method getDialogView
 */
NetPokerClientView.prototype.getDialogView = function() {
	return this.dialogView;
}

/**
 * Get dialog view.
 * @method getDealerButtonView
 */
NetPokerClientView.prototype.getDealerButtonView = function() {
	return this.dealerButtonView;
}

/**
 * Get table info view.
 * @method getTableInfoView
 */
NetPokerClientView.prototype.getTableInfoView = function() {
	return this.tableInfoView;
}

/**
 * Get settings view.
 * @method getSettingsView
 */
NetPokerClientView.prototype.getSettingsView = function() {
	return this.settingsView;
}

/**
 * Clear everything to an empty state.
 * @method clear
 */
NetPokerClientView.prototype.clear = function() {
	var i;

	for (i = 0; i < this.communityCards.length; i++)
		this.communityCards[i].hide();

	for (i = 0; i < this.seatViews.length; i++)
		this.seatViews[i].clear();

	this.timerView.hide();
	this.potView.setValues(new Array());
	this.dealerButtonView.hide();
	this.chatView.clear();

	this.presetButtonsView.hide();

	this.dialogView.hide();
	this.buttonsView.clear();

	this.tableInfoView.clear();
	this.settingsView.clear();
}

module.exports = NetPokerClientView;