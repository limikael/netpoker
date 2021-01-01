/**
 * Client.
 * @module client
 */

var Button = require("../../utils/Button");

/**
 * Select table button.
 * @class SelectTableButton
 */
class SelectTableButton extends Button {
	constructor(client) {
		super();
		this.resources = client.getResources();

		this.background = new PIXI.Sprite(this.resources.getTexture("selectTableButton"));
		this.addChild(this.background);

		this.selectedBackground = new PIXI.Sprite(this.resources.getTexture("selectedTableButton"));
		this.addChild(this.selectedBackground);

		var style = {
			fontFamily: "Times New Roman",
			fontWeiht: "bold",
			fontSize: 12,
			fill: "#ffffff",
		};

		this.indexField = new PIXI.Text("1", style);
		this.indexField.y = 4;
		this.addChild(this.indexField);
		this.setTableIndex(0);

		this.eleminatedIcon = new PIXI.Sprite(this.resources.getTexture("eleminatedTableIcon"));
		this.eleminatedIcon.x = this.width / 2 - this.eleminatedIcon.width / 2;
		this.eleminatedIcon.y = this.height / 2 - this.eleminatedIcon.height / 2;
		this.addChild(this.eleminatedIcon);

		this.setCurrent(false);
	}

	/**
	 * Set table index.
	 * @method setTableIndex
	 */
	setTableIndex(index) {
		this.indexField.text=(index + 1);
		this.indexField.x = 20 - this.indexField.width / 2;
	}

	/**
	 * Set enabled.
	 * @method setEnabled
	 */
	setEnabled(enabled) {
		super.setEnabled(enabled);
		this.eleminatedIcon.visible = !enabled;
		this.alpha = enabled ? 1 : .5;
	}

	/**
	 * Set current.
	 * @method setEnabled
	 */
	setCurrent(current) {
		this.selectedBackground.visible = current;
	}
}

module.exports = SelectTableButton;
