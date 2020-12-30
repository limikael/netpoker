/**
 * Client.
 * @module client
 */

const NineSlice = require("../../utils/NineSlice");
const Slider = require("../../utils/Slider");
const TextInput = require("pixi-text-input");
const MouseOverGroup = require("../../utils/MouseOverGroup");

/**
 * Chat view.
 * @class ChatView
 */
class ChatView extends PIXI.Container {
	constructor(client) {
		super();

		this.resources=client.getResources();
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
			fontFamily: "Arial",
			fontSize: 12,
			wordWrapWidth: 310,
			height: 114,
			border: true,
			color: 0xFFFFFF,
			borderColor: 0x404040,
			wordWrap: true,
			multiline: true
		};

		this.container = new PIXI.Container();
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

		this.inputField=new PIXI.TextInput({
			input: {
				fontFamily: 'Arial',
				fontSize: "14px",
				padding: "4px 4px",
				width: '310px',
				color: 'black'
			},
			box: {
				fill: 0xffffff,
				stroke: {color: 0x000000, width: 1}
			}
		});

		this.inputField.position.x = this.container.position.x;
		this.inputField.position.y = 681;
		this.inputField.on("keydown",this.onKeyDown)
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
		this.slider.on("change", this.onSliderChange);
		this.addChild(this.slider);


		this.mouseOverGroup = new MouseOverGroup();
		this.mouseOverGroup.addDisplayObject(this.chatText);
		this.mouseOverGroup.addDisplayObject(this.slider);
		this.mouseOverGroup.addDisplayObject(this.chatMask);
		this.mouseOverGroup.addDisplayObject(chatPlate);
		this.mouseOverGroup.on("mouseover", this.onChatFieldMouseOver, this);
		this.mouseOverGroup.on("mouseout", this.onChatFieldMouseOut, this);
		this.mouseOverGroup.on("mousedown", this.onChatFieldMouseDown, this);
		this.mouseOverGroup.on("mouseup", this.onChatFieldMouseUp, this);

		chatPlate.touchstart = this.onChatFieldMouseDown.bind(this);


		this.clear();
	}

	/**
	 * Clear messages.
	 * @method clear
	 */
	clear() {
		this.chatText.text="";
		this.chatText.y = -Math.round(this.slider.getValue() * (this.chatText.height + this.margin - this.chatMask.height));
		this.slider.setValue(1);
	}

	/**
	 *  Add text.
	 * @method clear
	 */
	addText(user, text) {
		var s="";

		if (user)
			s += user + ": ";

		s += text;

		if (this.chatText.text)
			this.chatText.text+=("\n" + s);
		else
			this.chatText.text=s;

		this.chatText.y = -Math.round(this.slider.getValue() * (this.chatText.height + this.margin - this.chatMask.height));
		this.slider.setValue(1);
	}

	/**
	 * On slider value change
	 * @method onSliderChange
	 */
	onSliderChange=()=> {
		this.chatText.y = -Math.round(this.slider.getValue() * (this.chatText.height + this.margin - this.chatMask.height));
	}


	/**
	 * On mouse over
	 * @method onChatFieldMouseOver
	 */
	onChatFieldMouseOver=()=> {
		this.slider.visible=true;//show();
	}

	/**
	 * On mouse out
	 * @method onChatFieldMouseOut
	 */
	onChatFieldMouseOut=()=> {
		this.slider.visible=false; //hide();
	}

	/**
	 * On mouse down
	 * @method onChatFieldMouseDown
	 */
	onChatFieldMouseDown=(interaction_object)=>{
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
	onChatFieldMouseUp=(interaction_object)=> {
		interaction_object.target.touchend = interaction_object.target.touchendoutside = null;
		interaction_object.target.touchmove = null;
		this.slider.hide();
	}

	/**
	 * On mouse up
	 * @method onChatFieldMouseUp
	 */
	onChatFieldMouseMove=(interaction_object)=> {
		var pos = interaction_object.global.y;
		var diff = pos - this.startMousePos;

		this.slider.setValue((-(this.startPos + diff)) / (this.chatText.height + this.margin - this.chatMask.height));
		this.onSliderChange();
	}

	/**
	 * On key down
	 * @method onKeyDown
	 */
	onKeyDown=(keyCode)=>{
		if (keyCode == 13) {
			this.emit("chat",this.inputField.text);
			this.inputField.text="";
		}
	}
}

module.exports = ChatView;