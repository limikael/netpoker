/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var EventDispatcher = require("yaed");
var Button = require("../../utils/Button");
var Slider = require("../../utils/Slider");
var NineSlice = require("../../utils/NineSlice");
var BigButton = require("./BigButton");
var RaiseShortcutButton = require("./RaiseShortcutButton");
var inherits = require("inherits");

/**
 * Buttons
 * @class ButtonsView
 */
function ButtonsView(viewConfig, resources) {
	PIXI.DisplayObjectContainer.call(this);

	this.resources = resources;

	this.buttonHolder = new PIXI.DisplayObjectContainer();
	this.addChild(this.buttonHolder);

	var sliderBackground = new NineSlice(this.resources.getTexture("sliderBackground"), 20, 0, 20, 0);
	sliderBackground.setLocalSize(300, sliderBackground.height);
	//sliderBackground.width = 300;

	var knob = new PIXI.Sprite(this.resources.getTexture("sliderKnob"));

	this.slider = new Slider(sliderBackground, knob);
	var pos = this.resources.getPoint("bigButtonPosition");
	this.slider.position.x = pos.x;
	this.slider.position.y = pos.y - 35;
	this.slider.addEventListener("change", this.onSliderChange, this);
	this.addChild(this.slider);


	this.buttonHolder.position.x = 366;
	this.buttonHolder.position.y = 575;

	this.buttons = [];

	for (var i = 0; i < 3; i++) {
		var button = new BigButton(this.resources);
		button.on(Button.CLICK, this.onButtonClick, this);
		button.position.x = i * 105;
		this.buttonHolder.addChild(button);
		this.buttons.push(button);
	}

	var raiseSprite = new PIXI.Sprite(this.resources.getTexture("sliderKnob"));
	var arrowSprite = new PIXI.Sprite(this.resources.getTexture("upArrow"));
	arrowSprite.position.x = (raiseSprite.width - arrowSprite.width) * 0.5 - 0.5;
	arrowSprite.position.y = (raiseSprite.height - arrowSprite.height) * 0.5 - 2;
	raiseSprite.addChild(arrowSprite);

	this.raiseMenuButton = new Button(raiseSprite);
	this.raiseMenuButton.addEventListener(Button.CLICK, this.onRaiseMenuButtonClick, this);
	this.raiseMenuButton.position.x = 2 * 105 + 70;
	this.raiseMenuButton.position.y = -5;
	this.buttonHolder.addChild(this.raiseMenuButton);

	this.raiseMenuButton.visible = false;
	this.createRaiseAmountMenu();

	this.setButtons([], 0, -1, -1);

	this.buttonsDatas = [];
}

inherits(ButtonsView, PIXI.DisplayObjectContainer);
EventDispatcher.init(ButtonsView);

ButtonsView.BUTTON_CLICK = "buttonClick";


/**
 * Create raise amount menu.
 * @method createRaiseAmountMenu
 */
ButtonsView.prototype.createRaiseAmountMenu = function() {
	this.raiseAmountMenu = new PIXI.DisplayObjectContainer();

	this.raiseMenuBackground = new NineSlice(this.resources.getTexture("chatBackground"), 10, 10, 10, 10);
	this.raiseMenuBackground.position.x = 0;
	this.raiseMenuBackground.position.y = 0;
	this.raiseMenuBackground.width = 125;
	this.raiseMenuBackground.height = 220;
	this.raiseAmountMenu.addChild(this.raiseMenuBackground);

	this.raiseAmountMenu.x = 645;
	this.raiseAmountMenu.y = 570 - this.raiseAmountMenu.height;
	this.addChild(this.raiseAmountMenu);

	var styleObject = {
		font: "bold 18px Arial",
	};

	var t = new PIXI.Text("RAISE TO", styleObject);
	t.position.x = (125 - t.width) * 0.5;
	t.position.y = 10;
	this.raiseAmountMenu.addChild(t);

	this.raiseShortcutButtons = new Array();

	for (var i = 0; i < 6; i++) {
		var b = new RaiseShortcutButton(this.resources);
		b.addEventListener(Button.CLICK, this.onRaiseShortcutClick, this);
		b.position.x = 10;
		b.position.y = 35 + i * 30;

		this.raiseAmountMenu.addChild(b);
		this.raiseShortcutButtons.push(b);
	}

	/*
		PixiTextinput should be used.
		this.raiseAmountMenuInput=new TextField();
		this.raiseAmountMenuInput.x=10;
		this.raiseAmountMenuInput.y=40+30*5;
		this.raiseAmountMenuInput.width=105;
		this.raiseAmountMenuInput.height=19;
		this.raiseAmountMenuInput.border=true;
		this.raiseAmountMenuInput.borderColor=0x404040;
		this.raiseAmountMenuInput.background=true;
		this.raiseAmountMenuInput.multiline=false;
		this.raiseAmountMenuInput.type=TextFieldType.INPUT;
		this.raiseAmountMenuInput.addEventListener(Event.CHANGE,onRaiseAmountMenuInputChange);
		this.raiseAmountMenuInput.addEventListener(KeyboardEvent.KEY_DOWN,onRaiseAmountMenuInputKeyDown);
		this.raiseAmountMenu.addChild(this.raiseAmountMenuInput);
		*/

	this.raiseAmountMenu.visible = false;
}

/**
 * Raise amount button.
 * @method onRaiseMenuButtonClick
 */
ButtonsView.prototype.onRaiseShortcutClick = function() {
	/*var b = cast e.target;

	_raiseAmountMenu.visible=false;

	buttons[_sliderIndex].value=b.value;
	_slider.value=(buttons[_sliderIndex].value-_sliderMin)/(_sliderMax-_sliderMin);
	_raiseAmountMenuInput.text=Std.string(buttons[_sliderIndex].value);

	trace("value click: "+b.value);*/
}



/**
 * Raise amount button.
 * @method onRaiseMenuButtonClick
 */
ButtonsView.prototype.onRaiseMenuButtonClick = function() {
	this.raiseAmountMenu.visible = !this.raiseAmountMenu.visible;
	/*
		if(this.raiseAmountMenu.visible) {
			this.stage.mousedown = this.onStageMouseDown.bind(this);
			// this.raiseAmountMenuInput.focus();
			// this.raiseAmountMenuInput.SelectAll
		}
		else {
			this.stage.mousedown = null;
		}*/
}

/**
 * Slider change.
 * @method onSliderChange
 */
ButtonsView.prototype.onSliderChange = function() {
	var newValue = Math.round(this.sliderMin + this.slider.getValue() * (this.sliderMax - this.sliderMin));
	this.buttons[this.sliderIndex].setValue(newValue);
	this.buttonDatas[this.sliderIndex].value = newValue;
	console.log("newValue = " + newValue);

	//this.raiseAmountMenuInput.setText(buttons[_sliderIndex].value.toString());
}

/**
 * Show slider.
 * @method showSlider
 */
ButtonsView.prototype.showSlider = function(index, min, max) {
	console.log("showSlider");
	this.sliderIndex = index;
	this.sliderMin = min;
	this.sliderMax = max;

	console.log("this.buttonDatas[" + index + "] = " + this.buttonDatas[index].getValue() + ", min = " + min + ", max = " + max);
	this.slider.setValue((this.buttonDatas[index].getValue() - min) / (max - min));
	console.log("this.slider.getValue() = " + this.slider.getValue());
	this.slider.visible = true;
	this.slider.show();
}

/**
 * Clear.
 * @method clear
 */
ButtonsView.prototype.clear = function() {
	this.buttonDatas = [];
	this.setButtons([], 0, -1, -1);
	this.slider.visible = false;
}

/**
 * Set button datas.
 * @method setButtons
 */
ButtonsView.prototype.setButtons = function(buttonDatas, sliderButtonIndex, min, max) {
	this.buttonDatas = buttonDatas;

	for (var i = 0; i < this.buttons.length; i++) {
		var button = this.buttons[i];
		if (i >= buttonDatas.length) {
			button.visible = false;
			continue;
		}

		var buttonData = buttonDatas[i];

		button.visible = true;
		button.setLabel(buttonData.getButtonString());
		button.setValue(buttonData.getValue());

	}

	if ((min >= 0) && (max >= 0))
		this.showSlider(sliderButtonIndex, min, max);

	else
		this.slider.visible = false;

	this.buttonHolder.position.x = 366;

	if (buttonDatas.length < 3)
		this.buttonHolder.position.x += 45;
}

/**
 * Button click.
 * @method onButtonClick
 * @private
 */
ButtonsView.prototype.onButtonClick = function(e) {
	var buttonIndex = -1;

	for (var i = 0; i < this.buttons.length; i++) {
		this.buttons[i].visible = false;
		if (e.target == this.buttons[i])
			buttonIndex = i;
	}

	this.slider.visible = false;

	//console.log("button click: " + buttonIndex);
	var buttonData = this.buttonDatas[buttonIndex];

	this.trigger({
		type: ButtonsView.BUTTON_CLICK,
		button: buttonData.getButton(),
		value: buttonData.getValue()
	});
}

module.exports = ButtonsView;