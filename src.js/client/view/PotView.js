/**
 * Client.
 * @module client
 */

const TWEEN = require('@tweenjs/tween.js');
var ChipsView = require("./ChipsView");

/**
 * A pot view
 * @class PotView
 */
class PotView extends PIXI.Container {
	constructor(client) {
		super();

		this.client=client;
		this.resources = client.getResources();
		this.value = 0;

		this.holder = new PIXI.Container();
		this.addChild(this.holder);

		this.stacks = new Array();
	}

	/**
	 * Set value.
	 * @method setValue
	 */
	setValues(values) {
		for(var i = 0; i < this.stacks.length; i++)
			this.holder.removeChild(this.stacks[i]);

		this.stacks = new Array();

		var pos = 0;

		for(var i = 0; i < values.length; i++) {
			var chips = new ChipsView(this.client);
			this.stacks.push(chips);
			this.holder.addChild(chips);
			chips.setValue(values[i]);
			chips.x = pos;
			pos += Math.floor(chips.width + 20);

			var textField = new PIXI.Text(values[i], {
				fontFamily: "Arial",
				fontWeight: "bold",
				fontSize: 12,
				align: "center",
				fill: "#ffffff"
			});

			textField.position.x = (chips.width - textField.width)*0.5;
			textField.position.y = 30;

			chips.addChild(textField);
		}

		this.holder.x = -this.holder.width*0.5;
	}

	/**
	 * Hide.
	 * @method hide
	 */
	hide() {
		this.visible = false;
	}

	/**
	 * Show.
	 * @method show
	 */
	show() {
		this.visible = true;
	}
}

module.exports = PotView;