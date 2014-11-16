var FunctionUtil = require("../../../src/utils/FunctionUtil");
var PixiApp = require("../../../src/utils/PixiApp");
var Gradient = require("../../../src/utils/Gradient");
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

inherits(GradientTest, PixiApp);

new GradientTest();