/**
 * Client.
 * @module client
 */

var SelectTableButton = require("./SelectTableButton");
var Button = require("../../utils/Button");

/**
 * Select table during tournament.
 * @class TableButtonsView
 */
class TableButtonsView extends PIXI.Container {
	constructor(client) {
		super();
		this.client=client;
		this.resources=client.getResources();

		this.holder = new PIXI.Container();
		this.addChild(this.holder);

		this.buttons = [];
		this.holder.y = 10;
	}

	/**
	 * Show buttons.
	 * @method showButtons
	 */
	showButtons(enabled, currentIndex) {
		for (var b = 0; b < this.buttons.length; b++)
			this.holder.removeChild(this.buttons[b]);

		this.buttons = [];

		for (var i = 0; i < enabled.length; i++) {
			var button = new SelectTableButton(this.client);
			button.on("click",this.onButtonClick);
			button.x = (i % 4) * 40;
			button.y = Math.floor(i / 4) * 24;
			button.setEnabled(enabled[i]);
			button.setTableIndex(i);

			if (i == currentIndex)
				button.setCurrent(true);

			this.buttons.push(button);
			this.holder.addChild(button);
		}

		this.holder.x = 960 - 10 - this.holder.width;
	}

	/**
	 * Clear.
	 * @method clear
	 */
	clear = function() {
		for (var b = 0; b < this.buttons.length; b++)
			this.holder.removeChild(this.buttons[b]);

		this.buttons = [];
	}

	/**
	 * Button click.
	 * @method onButtonClick
	 */
	onButtonClick=(ev)=>{
		var index = this.buttons.indexOf(ev.target);

		this.emit("tableClick",index);
	}
}

module.exports = TableButtonsView;