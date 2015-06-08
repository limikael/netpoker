/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var EventDispatcher = require("yaed");
var DialogButton = require("./DialogButton");
var inherits = require("inherits");
var ButtonData = require("../../proto/data/ButtonData");
var ObjectUtil = require("../../utils/ObjectUtil");

/**
 * Show table info.
 * @class TableInfoView
 */
function TableInfoView(viewConfig, resources) {
	PIXI.DisplayObjectContainer.call(this);

	this.viewConfig = viewConfig;
	this.resources = resources;

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

	var style = {
		font: "bold 24px Times New Roman",
		fill: "#ffffff",
		align: "center"
	};

	this.preTournamentInfoText = new PIXI.Text("<PreTournamentInfoText>", style);
	this.preTournamentInfoText.position.y = 360;
	//this.preTournamentInfoText.position.y = 280;
	this.preTournamentInfoText.position.x = Math.round(960 - 300) / 2;
	this.preTournamentInfoText.alpha = .25;
	this.addChild(this.preTournamentInfoText);

	var style = {
		font: "bold 12px Arial",
		fill: "#ffffff",
		dropShadow: true,
		dropShadowColor: "#000000",
		dropShadowDistance: 1,
		stroke: "#000000",
		strokeThickness: 1,
	};

	this.handInfoText = new PIXI.Text("<HandInfoText>", style);
	this.handInfoText.position.y = 10;
	this.handInfoText.position.x = 10; //960 - this.handInfoText.width;
	this.addChild(this.handInfoText);

	this.joinButton = new DialogButton(this.resources);
	this.joinButton.position.x = 355;
	this.joinButton.setText("JOIN");
	this.joinButton.visible = false;
	this.joinButton.on("click", this.onButtonClick, this);
	this.addChild(this.joinButton);

	this.leaveButton = new DialogButton(this.resources);
	this.leaveButton.position.x = 355;
	this.leaveButton.setText("LEAVE");
	this.leaveButton.visible = false;
	this.leaveButton.on("click", this.onButtonClick, this);
	this.addChild(this.leaveButton);

	var style = {
		font: "bold 24px Times New Roman",
		fill: "#ffffff",
		dropShadow: true,
		dropShadowColor: "#000000",
		dropShadowDistance: 2,
		stroke: "#000000",
		strokeThickness: 2
	};

	this.tournamentResultLeftField = new PIXI.Text("<left>", style);
	this.addChild(this.tournamentResultLeftField);

	var style2 = ObjectUtil.copy(style);
	style2.align = 'right';

	this.tournamentResultRightField = new PIXI.Text("<right>", style2);
	this.addChild(this.tournamentResultRightField);

	this.tournamentResultLeftField.y = 260;
	this.tournamentResultRightField.y = 260;
}

inherits(TableInfoView, PIXI.DisplayObjectContainer);
EventDispatcher.init(TableInfoView);

TableInfoView.BUTTON_CLICK = "buttonClick";

/**
 * Set left and right column.
 * @method setTournamentResultText
 */
TableInfoView.prototype.setTournamentResultText = function(left, right) {
	this.tournamentResultLeftField.setText(left);
	this.tournamentResultRightField.setText(right);

	this.tournamentResultLeftField.x = 480 - 180;
	this.tournamentResultRightField.x = 480 + 180 - this.tournamentResultRightField.width;

	var h = this.tournamentResultLeftField.height;

	this.tournamentResultLeftField.y = 300 - h / 2;
	this.tournamentResultRightField.y = 300 - h / 2;
}

/**
 * Set table info text.
 * @method setTableInfoText
 */
TableInfoView.prototype.setTableInfoText = function(s) {
	if (!s)
		s = "";

	this.tableInfoText.setText(s);
	this.joinButton.position.y = this.tableInfoText.position.y + this.tableInfoText.height + 5;
	this.leaveButton.position.y = this.tableInfoText.position.y + this.tableInfoText.height + 5;
}

/**
 * Set pre tournament info text.
 * @method setPreTournamentInfoText
 */
TableInfoView.prototype.setPreTournamentInfoText = function(s) {
	if (!s)
		s = "";

	this.preTournamentInfoText.setText(s);
	this.preTournamentInfoText.position.x = 960 / 2 - this.preTournamentInfoText.width / 2;
}

/**
 * Join button.
 * @method setJoinButtonVisible
 */
TableInfoView.prototype.setJoinButtonVisible = function(value) {
	this.joinButton.visible = value;
}

/**
 * Join button
 * @method setLeaveButtonVisible
 */
TableInfoView.prototype.setLeaveButtonVisible = function(value) {
	this.leaveButton.visible = value;
}

/**
 * Set hand info text.
 * @method setTableInfoText
 */
TableInfoView.prototype.setHandInfoText = function(s) {
	if (!s)
		s = "";

	this.handInfoText.setText(s);
	this.handInfoText.updateTransform();
}

/**
 * Clear.
 * @method clear
 */
TableInfoView.prototype.clear = function() {
	this.tableInfoText.setText("");
	this.handInfoText.setText("");
	this.preTournamentInfoText.setText("");
	this.tournamentResultLeftField.setText("");
	this.tournamentResultRightField.setText("");
	this.joinButton.visible = false;
	this.leaveButton.visible = false;
}

/**
 * Button click
 * @method onButtonClick
 * @private
 */
TableInfoView.prototype.onButtonClick = function(e) {
	this.joinButton.visible = false;
	this.leaveButton.visible = false;

	var ev = {
		type: TableInfoView.BUTTON_CLICK
	};

	if (e.target == this.joinButton)
		ev.button = ButtonData.JOIN_TOURNAMENT;

	if (e.target == this.leaveButton)
		ev.button = ButtonData.LEAVE_TOURNAMENT;

	console.log("button click");
	this.trigger(ev);
}

module.exports = TableInfoView;