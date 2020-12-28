/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var NineSlice = require("../../utils/NineSlice");
var Slider = require("../../utils/Slider");
var PixiTextInput = require("pixitextinput");
var MouseOverGroup = require("../../utils/MouseOverGroup");
var EventDispatcher = require("yaed");
var inherits = require("inherits");

/**
 * Chat view.
 * @class ChatView
 */
function ChatView(viewConfig, resources) {
	PIXI.DisplayObjectContainer.call(this);

	this.resources = resources;
	this.margin = 5;


	var chatPlate = new NineSlice(this.resources.getTexture("framePlate"), 10);
	chatPlate.position.x = 10;
	chatPlate.position.y = 540;
	chatPlate.setLocalSize(330, 130);
	this.addChild(chatPlate);

	var s = new NineSlice(this.resources.getTexture("framePlate"), 10);
	s.position.x = 10;
	s.position.y = 675;
	s.setLocalSize(330, 35);
	this.addChild(s);

	var styleObject = {
		font: "12px Arial",
		wordWrapWidth: 310,
		height: 114,
		border: true,
		color: 0xFFFFFF,
		borderColor: 0x404040,
		wordWrap: true,
		multiline: true
	};

	this.container = new PIXI.DisplayObjectContainer();
	this.addChild(this.container);
	this.container.position.x = 20;
	this.container.position.y = 548;

	this.chatMask = new PIXI.Graphics();
	this.chatMask.beginFill(123);
	this.chatMask.drawRect(0, 0, 310, 114);
	this.chatMask.endFill();
	this.container.addChild(this.chatMask);

	this.chatText = new PIXI.Text("", styleObject);
	this.container.addChild(this.chatText);
	this.chatText.mask = this.chatMask;



	var styleObject = {
		font: "14px Arial",
		width: 310,
		height: 19,
		border: true,
		borderColor: 0x404040,
		background: true,
		multiline: true
	};
	this.inputField = new PixiTextInput("", styleObject);
	this.inputField.position.x = this.container.position.x;
	this.inputField.position.y = 683;
	this.inputField.width = 310;
	this.inputField.keydown = this.onKeyDown.bind(this);

	var inputShadow = new PIXI.Graphics();
	inputShadow.beginFill(0x000000);
	inputShadow.drawRect(-1, -1, 311, 20);
	inputShadow.position.x = this.inputField.position.x;
	inputShadow.position.y = this.inputField.position.y;
	this.addChild(inputShadow);

	var inputBackground = new PIXI.Graphics();
	inputBackground.beginFill(0xFFFFFF);
	inputBackground.drawRect(0, 0, 310, 19);
	inputBackground.position.x = this.inputField.position.x;
	inputBackground.position.y = this.inputField.position.y;
	this.addChild(inputBackground);

	this.addChild(this.inputField);



	var slideBack = new NineSlice(this.resources.getTexture("textScrollbarTrack"), 10, 0, 10, 0);
	slideBack.width = 107;
	var slideKnob = new NineSlice(this.resources.getTexture("textScrollbarThumb"), 10, 0, 10, 0);
	slideKnob.width = 30;


	this.slider = new Slider(slideBack, slideKnob);
	this.slider.rotation = Math.PI * 0.5;
	this.slider.position.x = 326;
	this.slider.position.y = 552;
	this.slider.setValue(1);
	this.slider.visible = false;
	this.slider.addEventListener("change", this.onSliderChange.bind(this));
	this.addChild(this.slider);


	this.mouseOverGroup = new MouseOverGroup();
	this.mouseOverGroup.addDisplayObject(this.chatText);
	this.mouseOverGroup.addDisplayObject(this.slider);
	this.mouseOverGroup.addDisplayObject(this.chatMask);
	this.mouseOverGroup.addDisplayObject(chatPlate);
	this.mouseOverGroup.addEventListener("mouseover", this.onChatFieldMouseOver, this);
	this.mouseOverGroup.addEventListener("mouseout", this.onChatFieldMouseOut, this);
	this.mouseOverGroup.addEventListener("mousedown", this.onChatFieldMouseDown, this);
	this.mouseOverGroup.addEventListener("mouseup", this.onChatFieldMouseUp, this);

	chatPlate.touchstart = this.onChatFieldMouseDown.bind(this);


	this.clear();
}

inherits(ChatView, PIXI.DisplayObjectContainer);
EventDispatcher.init(ChatView);



/**
 * Clear messages.
 * @method clear
 */
ChatView.prototype.clear = function() {
	this.chatText.setText("");
	this.chatText.y = -Math.round(this.slider.getValue() * (this.chatText.height + this.margin - this.chatMask.height));
	this.slider.setValue(1);
}


/**
 *  Add text.
 * @method clear
 */
ChatView.prototype.addText = function(user, text) {
	var s="";

	if (user)
		s += user + ": ";

	s += text;

	var old=this.chatText.text;
	old.trim();

	this.chatText.setText(old + s + "\n");
//	this.chatText.setText(s + "\n");
	this.chatText.y = -Math.round(this.slider.getValue() * (this.chatText.height + this.margin - this.chatMask.height));
	this.slider.setValue(1);
}

/**
 * On slider value change
 * @method onSliderChange
 */
ChatView.prototype.onSliderChange = function() {
	this.chatText.y = -Math.round(this.slider.getValue() * (this.chatText.height + this.margin - this.chatMask.height));
}


/**
 * On mouse over
 * @method onChatFieldMouseOver
 */
ChatView.prototype.onChatFieldMouseOver = function() {
	this.slider.show();
}


/**
 * On mouse out
 * @method onChatFieldMouseOut
 */
ChatView.prototype.onChatFieldMouseOut = function() {
	this.slider.hide();
}

/**
 * On mouse down
 * @method onChatFieldMouseDown
 */
ChatView.prototype.onChatFieldMouseDown = function(interaction_object) {
	interaction_object.target.touchend = interaction_object.target.touchendoutside = this.onChatFieldMouseUp.bind(this);
	interaction_object.target.touchmove = this.onChatFieldMouseMove.bind(this);
	this.startMousePos = interaction_object.global.y;
	this.startPos = this.chatText.y;
	this.slider.show();
}

/**
 * On mouse up
 * @method onChatFieldMouseUp
 */
ChatView.prototype.onChatFieldMouseUp = function(interaction_object) {
	interaction_object.target.touchend = interaction_object.target.touchendoutside = null;
	interaction_object.target.touchmove = null;
	this.slider.hide();
}

/**
 * On mouse up
 * @method onChatFieldMouseUp
 */
ChatView.prototype.onChatFieldMouseMove = function(interaction_object) {
	var pos = interaction_object.global.y;
	var diff = pos - this.startMousePos;

	this.slider.setValue((-(this.startPos + diff)) / (this.chatText.height + this.margin - this.chatMask.height));
	this.onSliderChange();
}

/**
 * On key down
 * @method onKeyDown
 */
ChatView.prototype.onKeyDown = function(event) {
	if (event.keyCode == 13) {
		this.dispatchEvent("chat", {
			text: this.inputField.text
		});

		this.inputField.setText("");

	}
}



module.exports = ChatView;