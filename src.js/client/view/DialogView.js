/**
 * Client.
 * @module client
 */

const NineSlice = require("../../utils/NineSlice");
const DialogButton = require("./DialogButton");
const TextInput = require("../../utils/TextInput");

/**
 * Dialog view.
 * @class DialogView
 */
class DialogView extends PIXI.Container {
	constructor(client) {
		super();

		this.client=client;
		this.resources=client.getResources();

		var cover = new PIXI.Graphics();
		cover.beginFill(0x000000, .5);
		cover.drawRect(-1000, -1000, 960 + 2000, 720 + 2000);
		cover.endFill();
		cover.interactive = true;
		//cover.buttonMode = true;
		cover.hitArea = new PIXI.Rectangle(0, 0, 960, 720);
		this.addChild(cover);

		var b = new NineSlice(this.resources.getTexture("framePlate"), 10);
		b.setLocalSize(480, 270);
		b.position.x = 480 - 480 / 2;
		b.position.y = 360 - 270 / 2;
		this.addChild(b);

		let style = {
			fontFamily: "Arial",
			fontWeight: "normal",
			fontSize: 14
		};

		this.textField = new PIXI.Text("[text]", style);
		this.textField.position.x = b.position.x + 20;
		this.textField.position.y = b.position.y + 20;
		this.addChild(this.textField);

		this.buttonsHolder = new PIXI.Container();
		this.buttonsHolder.position.y = 430;
		this.addChild(this.buttonsHolder);
		this.buttons = [];

		for (var i = 0; i < 2; i++) {
			var b = new DialogButton(client);

			b.position.x = i * 90;
			b.on("click", this.onButtonClick, this);
			this.buttonsHolder.addChild(b);
			this.buttons.push(b);
		}

		this.inputField=new TextInput({
			input: {
				fontFamily: 'Arial',
				fontSize: "18px",
				padding: "4px 4px",
				width: '100px',
				color: 'black'
			},
			box: {
				fill: 0xffffff,
				stroke: {color: 0x000000, width: 2}
			}
		});

		this.inputField.position.x = this.textField.position.x;
		this.addChild(this.inputField);

		this.hide();
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
	show(text, buttonIds, defaultValue) {
		this.visible = true;
		this.buttonIds = buttonIds;

		for (let i = 0; i < this.buttons.length; i++) {
			if (i < buttonIds.length) {
				var button = this.buttons[i];
				button.setText(this.client.translate(buttonIds[i]));
				button.visible = true;
			} else {
				this.buttons[i].visible = false;
			}
		}

		this.buttonsHolder.x = 480 - buttonIds.length * 90 / 2;
		this.textField.text=text;

		if (defaultValue) {
			this.inputField.position.y = this.textField.position.y + this.textField.height + 20;
			this.inputField.visible = true;

			this.inputField.text = defaultValue;
			this.inputField.focus();
		} else {
			this.inputField.visible = false;
		}
	}

	/**
	 * Handle button click.
	 * @method onButtonClick
	 */
	onButtonClick=(e)=>{
		var buttonIndex = -1;

		for (var i = 0; i < this.buttons.length; i++)
			if (e.target == this.buttons[i])
				buttonIndex = i;

		var value = null;
		if (this.inputField.visible)
			value = Number(this.inputField.text);

		this.emit("buttonClick",this.buttonIds[buttonIndex],value);
		this.hide();
	}
}

module.exports = DialogView;