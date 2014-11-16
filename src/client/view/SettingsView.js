/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var TWEEN = require("tween.js");
var FunctionUtil = require("../../utils/FunctionUtil");
var Button = require("../../utils/Button");
var NineSlice = require("../../utils/NineSlice");
var Resources = require("resource-fiddle");
var EventDispatcher = require("yaed");
var SettingsCheckbox = require("./SettingsCheckbox");
var RaiseShortcutButton = require("./RaiseShortcutButton");
var CheckboxMessage = require("../../proto/messages/CheckboxMessage");
var ButtonData = require("../../proto/data/ButtonData");

/**
 * A settings view
 * @class SettingsView
 */
function SettingsView(viewConfig, resources) {
	PIXI.DisplayObjectContainer.call(this);

	this.viewConfig = viewConfig;
	this.resources = resources;

	var object = new PIXI.DisplayObjectContainer();
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
	this.settingsButton.addEventListener(Button.CLICK, this.onSettingsButtonClick, this);
	this.addChild(this.settingsButton);

	this.settingsMenu = new PIXI.DisplayObjectContainer();

	var mbg = new NineSlice(this.resources.getTexture("chatBackground"), 10, 10, 10, 10);
	mbg.setLocalSize(250, 100);
	this.settingsMenu.addChild(mbg);

	var styleObject = {
		font: "bold 14px Arial",
		color: "#FFFFFF",
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

	console.log("setting up settings, viewconfig=" + this.viewConfig);

	this.createMenuSetting("playAnimations", "Play animations", 40, this.viewConfig.getPlayAnimations());
	this.createMenuSetting(CheckboxMessage.AUTO_MUCK_LOSING, "Muck losing hands", 65);

	this.createSetting(CheckboxMessage.AUTO_POST_BLINDS, "Post blinds", 0);
	this.createSetting(CheckboxMessage.SITOUT_NEXT, "Sit out", 25);

	this.settingsMenu.visible = false;

	this.buyChipsButton = new RaiseShortcutButton(this.resources);
	this.buyChipsButton.addEventListener("click", this.onBuyChipsClick, this);
	this.buyChipsButton.x = 700;
	this.buyChipsButton.y = 635;
	this.buyChipsButton.setText("Buy chips");
	this.addChild(this.buyChipsButton);

	this.buyChipsButton.visible = false;

	// Prevent mouse over from falling through, doesn't work.
	/*this.settingsMenu.interactive = true;
	this.settingsMenu.buttonMode = true;
	this.settingsMenu.mouseover = function() { console.log("test"); };
	this.settingsMenu.mouseout = function() { console.log("test"); };
	this.settingsMenu.mousedown = function() { console.log("test"); };
	this.settingsMenu.mouseup = function() { console.log("test"); };
	this.settingsMenu.click = function() { console.log("test"); };*/
}

FunctionUtil.extend(SettingsView, PIXI.DisplayObjectContainer);
EventDispatcher.init(SettingsView);

SettingsView.BUY_CHIPS_CLICK = "buyChipsClick";
SettingsView.CHECKBOX_CHANGE = "checkboxChange";

/**
 * On buy chips button clicked.
 * @method onBuyChipsClick
 */
SettingsView.prototype.onBuyChipsClick = function(interaction_object) {
	console.log("buy chips click");
	this.dispatchEvent(SettingsView.BUY_CHIPS_CLICK);
}

/**
 * Create checkbox.
 * @method createMenuSetting
 */
SettingsView.prototype.createMenuSetting = function(id, string, y, def) {
	var setting = new SettingsCheckbox(this.resources, id, string);

	setting.y = y;
	setting.x = 16;
	this.settingsMenu.addChild(setting);

	setting.addEventListener("change", this.onCheckboxChange, this)

	this.settings[id] = setting;
	setting.setChecked(def);
}

/**
 * Create setting.
 * @method createSetting
 */
SettingsView.prototype.createSetting = function(id, string, y) {
	var setting = new SettingsCheckbox(this.resources, id, string);

	setting.y = 545 + y;
	setting.x = 700;
	this.addChild(setting);

	setting.addEventListener("change", this.onCheckboxChange, this)

	this.settings[id] = setting;
}

/**
 * Checkbox change.
 * @method onCheckboxChange
 */
SettingsView.prototype.onCheckboxChange = function(checkbox) {
	if (checkbox.id == "playAnimations") {
		this.viewConfig.setPlayAnimations(checkbox.getChecked());
		console.log("anims changed..");
	}

	this.dispatchEvent(SettingsView.CHECKBOX_CHANGE, {
		checkboxId: checkbox.id,
		checked: checkbox.getChecked()
	});
}

/**
 * Settings button click.
 * @method onSettingsButtonClick
 */
SettingsView.prototype.onSettingsButtonClick = function(interaction_object) {
	console.log("SettingsView.prototype.onSettingsButtonClick");
	this.settingsMenu.visible = !this.settingsMenu.visible;

	if (this.settingsMenu.visible) {
		this.stage.mousedown = this.stage.touchstart = this.onStageMouseDown.bind(this);
	} else {
		this.stage.mousedown = null;
	}
}

/**
 * Stage mouse down.
 * @method onStageMouseDown
 */
SettingsView.prototype.onStageMouseDown = function(interaction_object) {
	console.log("SettingsView.prototype.onStageMouseDown");
	if ((this.hitTest(this.settingsMenu, interaction_object)) || (this.hitTest(this.settingsButton, interaction_object))) {
		return;
	}

	this.stage.mousedown = null;
	this.settingsMenu.visible = false;
}

/**
 * Hit test.
 * @method hitTest
 */
SettingsView.prototype.hitTest = function(object, interaction_object) {
	if ((interaction_object.global.x > object.getBounds().x) && (interaction_object.global.x < (object.getBounds().x + object.getBounds().width)) &&
		(interaction_object.global.y > object.getBounds().y) && (interaction_object.global.y < (object.getBounds().y + object.getBounds().height))) {
		return true;
	}
	return false;
}

/**
 * Reset.
 * @method clear
 */
SettingsView.prototype.clear = function() {
	this.buyChipsButton.enabled = true;
	this.setVisibleButtons([]);

	this.setCheckboxChecked(CheckboxMessage.AUTO_POST_BLINDS, false);
	this.setCheckboxChecked(CheckboxMessage.AUTO_MUCK_LOSING, false);
	this.setCheckboxChecked(CheckboxMessage.SITOUT_NEXT, false);

	this.settingsMenu.visible = false;
	if (this.settingsMenu.visible)
		this.stage.mousedown = null;
}

/**
 * Set visible buttons.
 * @method setVisibleButtons
 */
SettingsView.prototype.setVisibleButtons = function(buttons) {
	this.buyChipsButton.visible = buttons.indexOf(ButtonData.BUY_CHIPS) != -1;
	this.settings[CheckboxMessage.AUTO_POST_BLINDS].visible = buttons.indexOf(CheckboxMessage.AUTO_POST_BLINDS) >= 0;
	this.settings[CheckboxMessage.SITOUT_NEXT].visible = buttons.indexOf(CheckboxMessage.SITOUT_NEXT) >= 0;

	var yp = 543;

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
	}
}

/**
 * Set checkbox state.
 * @method setCheckboxChecked
 */
SettingsView.prototype.setCheckboxChecked = function(id, checked) {
	console.log("setting checkbox state for: " + id);

	this.settings[id].setChecked(checked);
}

module.exports = SettingsView;