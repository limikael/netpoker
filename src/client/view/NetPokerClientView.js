/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var EventDispatcher = require("yaed");
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
var TableButtonsView = require("./TableButtonsView");
var inherits = require("inherits");
var TWEEN = require("tween.js");
var FadeTableMessage = require("../../proto/messages/FadeTableMessage");

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
	this.tableContainer.addChild(this.dealerButtonView);

	this.tableInfoView = new TableInfoView(this.viewConfig, this.resources);
	this.addChild(this.tableInfoView);

	this.potView = new PotView(this.viewConfig, this.resources);
	this.tableContainer.addChild(this.potView);
	this.potView.position.x = this.resources.getPoint("potPosition").x;
	this.potView.position.y = this.resources.getPoint("potPosition").y;

	this.settingsView = new SettingsView(this.viewConfig, this.resources);
	this.addChild(this.settingsView);

	this.dialogView = new DialogView(this.viewConfig, this.resources);
	this.addChild(this.dialogView);

	this.presetButtonsView = new PresetButtonsView(this.viewConfig, this.resources);
	this.addChild(this.presetButtonsView);

	this.tableButtonsView = new TableButtonsView(this.viewConfig);
	this.addChild(this.tableButtonsView);

	this.setupChips();

	this.fadeTableTween = null;
}

inherits(NetPokerClientView, PIXI.DisplayObjectContainer);
EventDispatcher.init(NetPokerClientView);

NetPokerClientView.SEAT_CLICK = "seatClick";
NetPokerClientView.FADE_TABLE_COMPLETE = "fadeTableComplete";

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

		chipsView.setAlignment(this.resources.getValue("betAlign").charAt(i));
		chipsView.setTargetPosition(this.resources.getPoint("betPosition" + i));
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
	var margin = parseInt(this.resources.getValue("communityCardMargin"));
	for (i = 0; i < 5; i++) {
		var cardView = new CardView(this.viewConfig, this.resources);
		cardView.hide();
		cardView.setTargetPosition(Point(p.x + i * (cardView.back.width + margin), p.y));

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
 * Get table buttons view.
 * @method getTableButtonsView
 */
NetPokerClientView.prototype.getTableButtonsView = function() {
	return this.tableButtonsView;
}

/**
 * Fade table.
 * @method fadeTable
 */
NetPokerClientView.prototype.fadeTable = function(visible, direction) {
	//console.log("fading table: "+visible);

	if (this.fadeTableTween) {
		console.log("there is already a tween...");
		this.fadeTableTween.onComplete(null);
		this.fadeTableTween.stop();
		this.fadeTableTween = null;
	}

	var dirMultiplier = 0;

	switch (direction) {
		case FadeTableMessage.LEFT:
			dirMultiplier = -1;
			break;

		case FadeTableMessage.RIGHT:
			dirMultiplier = 1;
			break;

		default:
			throw new Error("unknown fade direction: " + direction);
			break;
	}

	var target = {};
	var completeFunction;

	if (visible) {
		this.tableContainer.alpha = 0;
		this.tableContainer.x = -100 * dirMultiplier;
		target.alpha = 1;
		target.x = 0;
		completeFunction = this.onFadeInComplete.bind(this);
	} else {
		this.tableContainer.alpha = 1;
		this.tableContainer.x = 0;
		target.alpha = 0;
		target.x = 100 * dirMultiplier;
		completeFunction = this.onFadeOutComplete.bind(this);
	}

	var original = {
		x: this.tableContainer.x,
		alpha: this.tableContainer.alpha
	};

	this.fadeTableTween = new TWEEN.Tween(this.tableContainer);
	this.fadeTableTween.easing(TWEEN.Easing.Quadratic.InOut);
	this.fadeTableTween.onComplete(completeFunction);
	this.fadeTableTween.to(target, this.viewConfig.scaleAnimationTime(250));
	this.fadeTableTween.start();
	TWEEN.add(this.fadeTableTween);
}

/**
 * Fade out complete
 * @method onFadeOutComplete
 * @private
 */
NetPokerClientView.prototype.onFadeOutComplete = function() {
	if (!this.fadeTableTween)
		return;

	this.fadeTableTween.onComplete(null);
	this.fadeTableTween.stop();
	this.fadeTableTween = null;
	this.clearTableContents();

	this.trigger(NetPokerClientView.FADE_TABLE_COMPLETE);
}

/**
 * Fade in complete
 * @method onFadeInComplete
 * @private
 */
NetPokerClientView.prototype.onFadeInComplete = function() {
	if (!this.fadeTableTween)
		return;

	this.fadeTableTween.onComplete(null);
	this.fadeTableTween.stop();
	this.fadeTableTween = null;

	this.trigger(NetPokerClientView.FADE_TABLE_COMPLETE);
}

/**
 * Clear the contents of the table.
 * @method clearTableContents
 * @private
 */
NetPokerClientView.prototype.clearTableContents = function() {
	this.dealerButtonView.hide();

	for (i = 0; i < this.communityCards.length; i++)
		this.communityCards[i].hide();

	for (i = 0; i < this.seatViews.length; i++)
		this.seatViews[i].clear();

	this.timerView.hide();
	this.potView.setValues([]);
}

/**
 * Clear everything to an empty state.
 * @method clear
 */
NetPokerClientView.prototype.clear = function() {
	var i;

	this.clearTableContents();

	this.presetButtonsView.hide();

	this.chatView.clear();

	this.dialogView.hide();
	this.buttonsView.clear();

	this.tableInfoView.clear();
	this.settingsView.clear();
	this.tableButtonsView.clear();

	if (this.fadeTableTween) {
		this.fadeTableTween.stop();
		this.fadeTableTween = null;
	}

	this.tableContainer.alpha = 1;
	this.tableContainer.x = 0;
}

module.exports = NetPokerClientView;