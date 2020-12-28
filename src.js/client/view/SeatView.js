/**
 * Client.
 * @module client
 */

var TWEEN = require('@tweenjs/tween.js');
var Button = require("../../utils/Button");

/**
 * A seat view.
 * @class SeatView
 */
class SeatView extends Button {
	constructor(client, seatIndex) {
		super();

		this.pocketCards = [];
		this.resources = client.getResources();
		this.seatIndex = seatIndex;

		var seatSprite = this.resources.createSprite("seatPlate");

		seatSprite.position.x = -seatSprite.width / 2;
		seatSprite.position.y = -seatSprite.height / 2;

		this.addChild(seatSprite);

		var pos = this.resources.getPoint("seatPosition" + this.seatIndex);

		this.position.x = pos.x;
		this.position.y = pos.y;

		var style;

		style = {
			fontFamily: "Arial",
			fontWeight: "bold",
			fontSize: 20
		};

		this.nameField = new PIXI.Text("[name]", style);
		this.nameField.position.y = -20;
		this.addChild(this.nameField);

		style = {
			fontFamily: "Arial",
			fontWeight: "normal",
			fontSize: 12
		};

		this.chipsField = new PIXI.Text("[name]", style);
		this.chipsField.position.y = 5;
		this.addChild(this.chipsField);

		style = {
			fontFamily: "Arial",
			fontWeight: "bold",
			fontSize: 20
		};

		this.actionField = new PIXI.Text("action", style);
		this.actionField.position.y = -13;
		this.addChild(this.actionField);
		this.actionField.alpha = 0;

		this.setName("");
		this.setChips("");

		this.betChips = null;
	}

	/**
	 * Set reference to bet chips.
	 * @method setBetChipsView
	 */
	setBetChipsView(chipsView) {
		this.betChips = chipsView;
		chipsView.seatIndex = this.seatIndex;
	}

	/**
	 * Set name.
	 * @method setName
	 */
	setName(name) {
		if (!name)
			name = "";

		this.nameField.text=name;
		this.nameField.x = -this.nameField.width / 2;
	}

	/**
	 * Set name.
	 * @method setChips
	 */
	setChips(chips) {
		if (chips === undefined || chips === null)
			chips = "";

		this.chipsField.text=chips;
		this.chipsField.position.x = -this.chipsField.width / 2;
	}

	/**
	 * Set sitout.
	 * @method setSitout
	 */
	setSitout(sitout) {
		if (sitout)
			this.alpha = .5;

		else
			this.alpha = 1;
	}

	/**
	 * Set sitout.
	 * @method setActive
	 */
	setActive(active) {
		this.visible = active;
	}

	/**
	 * Add pocket card.
	 * @method addPocketCard
	 */
	addPocketCard(cardView) {
		this.pocketCards.push(cardView);
	}

	/**
	 * Get pocket cards.
	 * @method getPocketCards
	 */
	getPocketCards() {
		return this.pocketCards;
	}

	/**
	 * Fold cards.
	 * @method foldCards
	 */
	foldCards() {
		this.pocketCards[0].addEventListener("animationDone", this.onFoldComplete, this);
		for (var i = 0; i < this.pocketCards.length; i++) {
			this.pocketCards[i].fold();
		}
	}

	/**
	 * Fold complete.
	 * @method onFoldComplete
	 */
	onFoldComplete() {
		this.pocketCards[0].removeEventListener("animationDone", this.onFoldComplete, this);
		this.dispatchEvent("animationDone");
	}

	/**
	 * Show user action.
	 * @method action
	 */
	action(action) {
		this.actionField.text=action;
		this.actionField.position.x = -this.actionField.width / 2;

		this.actionField.alpha = 1;
		this.nameField.alpha = 0;
		this.chipsField.alpha = 0;

		setTimeout(this.onActionTimer, 1000);
	}

	/**
	 * Show user action.
	 * @method action
	 */
	onActionTimer=()=>{
		var t1 = new TWEEN.Tween(this.actionField)
			.to({
				alpha: 0
			}, 1000)
			.start();

		var t2 = new TWEEN.Tween(this.nameField)
			.to({
				alpha: 1
			}, 1000)
			.start();

		var t3 = new TWEEN.Tween(this.chipsField)
			.to({
				alpha: 1
			}, 1000)
			.start();
	}

	/**
	 * Clear.
	 * @method clear
	 */
	clear() {
		var i;

		this.visible = true;
		this.sitout = false;
		this.betChips.setValue(0);
		this.setName("");
		this.setChips("");

		for (i = 0; i < this.pocketCards.length; i++)
			this.pocketCards[i].hide();
	}
}

module.exports = SeatView;