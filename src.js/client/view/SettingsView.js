/**
 * Client.
 * @module client
 */

const TWEEN = require('@tweenjs/tween.js');
const Button = require("../../utils/Button");
const NineSlice = require("../../utils/NineSlice");
const SettingsCheckbox = require("./SettingsCheckbox");
const PixiUtil = require("../../utils/PixiUtil");

/**
 * A settings view
 * @class SettingsView
 */
class SettingsView extends PIXI.Container {
	constructor(client) {
		super();

		this.client=client;
		this.resources = client.getResources();

		var object = new PIXI.Container();
		var bg = new NineSlice(this.resources.getTexture("chatBackground"), 10, 10, 10, 10);
		bg.setLocalSize(30, 30);
		object.addChild(bg);

		var sprite = new PIXI.Sprite(this.resources.getTexture("wrenchIcon"));
		sprite.x = 5;
		sprite.y = 5;
		object.addChild(sprite);

		this.settingsButton = new Button(object);
		this.settingsButton.position.x = 960 - 10 - this.settingsButton.width;
		this.settingsButton.position.y = 543;
		this.settingsButton.on("click", this.onSettingsButtonClick);
		this.addChild(this.settingsButton);

		this.settingsMenu = new PIXI.Container();

		var mbg = new NineSlice(this.resources.getTexture("chatBackground"), 10, 10, 10, 10);
		mbg.setLocalSize(250, 100);
		this.settingsMenu.addChild(mbg);

		var styleObject = {
			fontFamily: "Arial",
			fontWeight: "bold",
			fontSize: 14,
			fill: "#FFFFFF",
			width: 200,
			height: 20
		};
		var label = new PIXI.Text("Settings", styleObject);
		label.position.x = 16;
		label.position.y = 10;

		this.settingsMenu.addChild(label);
		this.settingsMenu.position.x = 960 - 10 - this.settingsMenu.width;
		this.settingsMenu.position.y = 538 - this.settingsMenu.height;
		this.addChild(this.settingsMenu);

		this.settings = {};

		this.createMenuSetting("autoMuckLosing", "Muck losing hands", 65);
		this.createSetting("autoPostBlinds", "Auto post blinds", 0);
		this.createSetting("sitOutNext", "Sit out next hand", 25);

		this.settingsMenu.visible = false;

		/*this.buyChipsButton = new RaiseShortcutButton(this.resources);
		this.buyChipsButton.addEventListener("click", this.onBuyChipsClick, this);
		this.buyChipsButton.x = 700;
		this.buyChipsButton.y = 635;
		this.buyChipsButton.setText("Buy chips");
		this.addChild(this.buyChipsButton);
		this.buyChipsButton.visible = false;*/

		this.settingsMenu.interactive=true;
	}

	/**
	 * On buy chips button clicked.
	 * @method onBuyChipsClick
	 */
	onBuyChipsClick=()=>{
		console.log("buy chips click");
		this.emit("buyChipsClick");
	}

	/**
	 * Create checkbox.
	 * @method createMenuSetting
	 */
	createMenuSetting(id, string, y, def) {
		var setting = new SettingsCheckbox(this.client, id, string);

		setting.y = y;
		setting.x = 16;
		this.settingsMenu.addChild(setting);

		setting.on("change", this.onCheckboxChange, this)

		this.settings[id] = setting;
		setting.setChecked(def);
	}

	/**
	 * Create setting.
	 * @method createSetting
	 */
	createSetting(id, string, y) {
		var setting = new SettingsCheckbox(this.client, id, string);

		setting.y = 545 + y;
		setting.x = 700;
		this.addChild(setting);

		setting.on("change", this.onCheckboxChange, this)

		this.settings[id] = setting;
	}

	/**
	 * Checkbox change.
	 * @method onCheckboxChange
	 */
	onCheckboxChange(checkbox) {
		this.emit("checkboxChange",
			checkbox.id,
			checkbox.getChecked()
		);
	}

	/**
	 * Settings button click.
	 * @method onSettingsButtonClick
	 */
	onSettingsButtonClick=()=>{
		this.settingsMenu.visible = !this.settingsMenu.visible;

		PixiUtil.findTopParent(this).interactive=true;

		if (this.settingsMenu.visible)
			PixiUtil.findTopParent(this).on("mousedown",this.onStageMouseDown);

		else
			PixiUtil.findTopParent(this).off("mousedown",this.onStageMouseDown);
	}

	/**
	 * Stage mouse down.
	 * @method onStageMouseDown
	 */
	onStageMouseDown=(e)=>{
		if (PixiUtil.globalHitTest(this.settingsButton,e.data.global) ||
				PixiUtil.globalHitTest(this.settingsMenu,e.data.global))
			return;

		PixiUtil.findTopParent(this).off("mousedown",this.onStageMouseDown);
		this.settingsMenu.visible = false;
	}

	/**
	 * Reset.
	 * @method clear
	 */
	clear() {
		//this.buyChipsButton.enabled = true;
		this.setVisibleButtons([]);

		this.setCheckboxChecked("autoPostBlinds", false);
		this.setCheckboxChecked("autoMuckLosing", false);
		this.setCheckboxChecked("sitOutNext", false);

		this.settingsMenu.visible = false;
		if (this.settingsMenu.visible)
			PixiUtil.findTopParent(this).off("mousedown",this.onStageMouseDown);
	}

	/**
	 * Set visible buttons.
	 * @method setVisibleButtons
	 */
	setVisibleButtons = function(buttons) {
		//this.buyChipsButton.visible = buttons.indexOf(ButtonData.BUY_CHIPS) != -1;
		this.settings["autoPostBlinds"].visible = buttons.indexOf("autoPostBlinds") >= 0;
		this.settings["sitOutNext"].visible = buttons.indexOf("sitOutNext") >= 0;

		/*var yp = 543;

		if (this.buyChipsButton.visible) {
			this.buyChipsButton.y = yp;
			yp += 35;
		} else {
			yp += 2;
		}

		if (this.settings[CheckboxMessage.AUTO_POST_BLINDS].visible) {
			this.settings[CheckboxMessage.AUTO_POST_BLINDS].y = yp;
			yp += 25;
		}

		if (this.settings[CheckboxMessage.SITOUT_NEXT].visible) {
			this.settings[CheckboxMessage.SITOUT_NEXT].y = yp;
			yp += 25;
		}*/
	}

	/**
	 * Set checkbox state.
	 * @method setCheckboxChecked
	 */
	setCheckboxChecked = function(id, checked) {
		//console.log("setting checkbox state for: " + id);

		this.settings[id].setChecked(checked);
	}
}

module.exports = SettingsView;