var PIXI = require("pixi.js");
var FunctionUtil = require("../../utils/FunctionUtil");
var NineSlice = require("../../utils/NineSlice");
var Resources = require("../resources/Resources");

/**
 * Loading screen.
 */
function ChatView() {
	PIXI.DisplayObjectContainer.call(this);

	var s;

	s = new NineSlice(Resources.getInstance().framePlate, 10);
	s.position.x = 10;
	s.position.y = 540;
	s.setLocalSize(330, 130);
	this.addChild(s);

	s = new NineSlice(Resources.getInstance().framePlate, 10);
	s.position.x = 10;
	s.position.y = 675;
	s.setLocalSize(330, 35);
	this.addChild(s);
}

FunctionUtil.extend(ChatView, PIXI.DisplayObjectContainer);

module.exports = ChatView;