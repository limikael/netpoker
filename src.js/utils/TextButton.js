/**
 * Client.
 * @module client
 */

var Button = require("./Button");
var NineSlice = require("./NineSlice");

/**
 * Dialog button.
 * @class DialogButton
 */
class TextButton extends Button {
	constructor(style) {
		super();

		this.style=style;

		this.buttonTexture=style.texture;
		this.background=new NineSlice(this.buttonTexture,style.hEdge,10);
		this.addChild(this.background);

		this.textField = new PIXI.Text("[test]", style);
		this.textField.position.x=this.style.hEdge;
		this.textField.position.y=Math.floor(this.buttonTexture.height/2-this.style.fontSize/2);
		this.addChild(this.textField);

		this.setText("BTN");
	}


	/**
	 * Set text for the button.
	 * @method setText
	 */
	setText(text) {
		this.textField.text=text;
//		this.textField.x = this.buttonTexture.width / 2 - this.textField.width / 2;

		this.background.setLocalSize(this.textField.width+2*this.style.hEdge,this.buttonTexture.height);
	}
}

module.exports = TextButton;