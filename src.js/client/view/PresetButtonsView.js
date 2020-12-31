/**
 * Client.
 * @module client
 */

const TWEEN = require('@tweenjs/tween.js');
var PresetButton = require("./PresetButton");

/**
 * A pot view
 * @class PresetButtonsView
 */
class PresetButtonsView extends PIXI.Container {
	constructor(client) {
		super();

		this.client=client;
		this.resources=client.getResources();
		this.buttons = new Array();
		var origin = this.resources.getPoint("bigButtonPosition");

		for (var i = 0; i < 6; i++) {
			var p = new PresetButton(this.client,i);
			p.on("change", this.onPresetButtonChange);
			p.x = origin.x + 30 + 140 * (i % 2);
			p.y = origin.y + 35 * Math.floor(i / 2);
			this.addChild(p);
			this.buttons.push(p);
		}

		this.hide();
	}

	/**
	 * Preset button change.
	 * @method onPresetButtonChange
	 */
	onPresetButtonChange=(index)=>{
		for (let i = 0; i < this.buttons.length; i++)
			if (i!=index)
				this.buttons[i].setChecked(false);

		this.emit("change");
	}

	/**
	 * Hide.
	 * @method hide
	 */
	hide() {
		for (var i = 0; i < this.buttons.length; i++) {
			this.buttons[i].hide();
		}
	}

	/**
	 * Show.
	 * @method show
	 */
	show() {
		this.visible = true;
	}

	/**
	 * Get buttons.
	 * @method getButtons
	 */
	getButtons() {
		return this.buttons;
	}

	/**
	 * Get current preset button.
	 * @method getCurrent
	 */
	getCurrent() {
		for (var i = 0; i < this.buttons.length; i++) {
			if (this.buttons[i].getChecked() == true) {
				return this.buttons[i];
			}
		}
		return null;
	}

	/**
	 * Set current preset button.
	 * @method setCurrent
	 */
	setCurrent=function(id) {
		for (var i = 0; i < this.buttons.length; i++) {
			var b = this.buttons[i];
			if ((id != null) && (b.id == id)) {
				b.setChecked(true);
			} else {
				b.setChecked(false);
			}
		}
	}
}

module.exports = PresetButtonsView;