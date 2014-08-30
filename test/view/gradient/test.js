var FunctionUtil = require("../../../src/js/utils/FunctionUtil");
var PixiApp = require("../../../src/js/utils/PixiApp");
var Gradient = require("../../../src/js/utils/Gradient");
var PIXI = require("pixi.js");

function GradientTest() {
	PixiApp.call(this, 800, 600);

	var g = new Gradient();
	g.setSize(200, 100);
	g.addColorStop(0, "red");
	g.addColorStop(.5, "green");
	g.addColorStop(1, "blue");
	var s = g.createSprite();

	s.height = 600;
	s.width = 200;
	this.addChild(s);
}

FunctionUtil.extend(GradientTest, PixiApp);

new GradientTest();