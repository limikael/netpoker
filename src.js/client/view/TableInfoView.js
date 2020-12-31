/**
 * Client.
 * @module client
 */

var CountDownText = require("../../utils/CountDownText");
var TextButton = require("../../utils/TextButton");

/**
 * Show table info.
 * @class TableInfoView
 */
class TableInfoView extends PIXI.Container {
	constructor(client) {
		super();

		this.client=client;
		this.resources=this.client.getResources();

		var style = {
			fontFamily: "Times New Roman",
			fontSize: 24,
			fontWeight: "bold",
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
			fontFamily: "Times New Roman",
			fontSize: 24,
			fontWeight: "bold",
			fill: "#ffffff",
			align: "center"
		};

		this.preTournamentInfoText = new CountDownText("<PreTournamentInfoText>", style);
		this.preTournamentInfoText.position.y = 360;
		//this.preTournamentInfoText.position.y = 280;
		this.preTournamentInfoText.position.x = Math.round(960 - 300) / 2;
		this.preTournamentInfoText.alpha = .25;
		this.addChild(this.preTournamentInfoText);

		var style = {
			fontFamily: "Times New Roman",
			fontSize: 12,
			fontWeight: "bold",
			fill: "#ffffff",
			dropShadow: true,
			dropShadowColor: "#000000",
			dropShadowDistance: 1,
			stroke: "#000000",
			strokeThickness: 1,
		};

		this.handInfoText = new CountDownText("<HandInfoText>", style);
		this.handInfoText.position.y = 10;
		this.handInfoText.position.x = 10; //960 - this.handInfoText.width;
		this.addChild(this.handInfoText);

		let dialogButtonStyle={
			hEdge: 25,
			texture: this.resources.getTexture("dialogButton"),
			fontFamily: "Arial",
			fontSize: 14,
			fontWeight: "normal",
			fill: "#ffffff"
		}
	
		this.joinButton = new TextButton(dialogButtonStyle);
		this.joinButton.position.x = 355;
		this.joinButton.setText("JOIN");
		this.joinButton.visible = false;
		this.joinButton.on("click", this.onButtonClick, this);
		this.addChild(this.joinButton);

		this.leaveButton = new TextButton(dialogButtonStyle);
		this.leaveButton.position.x = 355;
		this.leaveButton.setText("LEAVE");
		this.leaveButton.visible = false;
		this.leaveButton.on("click", this.onButtonClick, this);
		this.addChild(this.leaveButton);

		var style = {
			fontFamily: "Times New Roman",
			fontSize: 24,
			fontWeight: "bold",
			fill: "#ffffff",
			dropShadow: true,
			dropShadowColor: "#000000",
			dropShadowDistance: 2,
			stroke: "#000000",
			strokeThickness: 2
		};

		this.tournamentResultLeftField = new PIXI.Text("<left>", style);
		this.addChild(this.tournamentResultLeftField);

		var style2 = {...style};
		style2.align = 'right';

		this.tournamentResultRightField = new PIXI.Text("<right>", style2);
		this.addChild(this.tournamentResultRightField);

		this.tournamentResultLeftField.y = 260;
		this.tournamentResultRightField.y = 260;
	}

	/**
	 * Set left and right column.
	 * @method setTournamentResultText
	 */
	setTournamentResultText(left, right) {
		this.tournamentResultLeftField.text=left;
		this.tournamentResultRightField.text=right;

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
	setTableInfoText(s) {
		if (!s)
			s = "";

		this.tableInfoText.text=s;
		this.joinButton.position.y = this.tableInfoText.position.y + this.tableInfoText.height + 5;
		this.leaveButton.position.y = this.tableInfoText.position.y + this.tableInfoText.height + 5;
	}

	/**
	 * Set pre tournament info text.
	 * @method setPreTournamentInfoText
	 */
	setPreTournamentInfoText(s, countDown) {
		if (!s)
			s = "";

		this.preTournamentInfoText.setText(s);
		this.preTournamentInfoText.setTimeLeft(countDown);
		this.preTournamentInfoText.position.x = 960 / 2 - this.preTournamentInfoText.width / 2;
	}

	/**
	 * Join button.
	 * @method setJoinButtonVisible
	 */
	setJoinButtonVisible(value) {
		this.joinButton.visible = value;
	}

	/**
	 * Join button
	 * @method setLeaveButtonVisible
	 */
	setLeaveButtonVisible(value) {
		this.leaveButton.visible = value;
	}

	/**
	 * Set hand info text.
	 * @method setTableInfoText
	 */
	setHandInfoText(s, countdown) {
		if (!s)
			s = "";

		this.handInfoText.setText(s);
		this.handInfoText.setTimeLeft(countdown);
		this.handInfoText.updateTransform();
	}

	/**
	 * Clear.
	 * @method clear
	 */
	clear() {
		this.handInfoText.setText("");
		this.preTournamentInfoText.setText("");

		this.tableInfoText.text="";
		this.tournamentResultLeftField.text="";
		this.tournamentResultRightField.text="";
		this.joinButton.visible = false;
		this.leaveButton.visible = false;
	}

	/**
	 * Button click
	 * @method onButtonClick
	 * @private
	 */
	onButtonClick(e) {
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
		this.emit(ev);
	}
}

module.exports = TableInfoView;