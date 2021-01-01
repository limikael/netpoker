/**
 * Client.
 * @module client
 */

var Gradient = require("../../utils/Gradient");

/**
 * Loading screen.
 * @class LoadingScreen
 */
class LoadingScreen extends PIXI.Container {
	constructor(client){
		super();
		this.client=client;

		var gradient = new Gradient();
		gradient.setSize(100, 100);
		gradient.addColorStop(0, "#ffffff");
		gradient.addColorStop(1, "#c0c0c0");

		var s = gradient.createSprite();
		s.position.x=-1000;
		s.position.y=-1000;
		s.width = 960+2000;
		s.height = 720+2000;
		this.addChild(s);

		var style = {
			font: "bold 20px Arial",
			fill: "#808080"
		};

		this.textField = new PIXI.Text("[text]", style);
		this.textField.position.x = 960 / 2;
		this.textField.position.y = 720 / 2 - this.textField.height / 2;
		this.addChild(this.textField);
	}

	/**
	 * Show.
	 * @method show
	 */
	show(message) {
		this.textField.text=message;
		this.textField.x = 960 / 2 - this.textField.width / 2;
		this.visible = true;
	}

	/**
	 * Hide.
	 * @method hide
	 */
	hide() {
		this.visible = false;
	}
}

module.exports = LoadingScreen;