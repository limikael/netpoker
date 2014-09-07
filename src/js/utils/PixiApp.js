"use strict";

var PIXI=require("pixi.js");
var TWEEN=require("tween.js");
var FunctionUtil=require("./FunctionUtil");
var ContentScaler=require("./ContentScaler");
var FrameTimer=require("./FrameTimer");

/**
 * Pixi full window app.
 * Can operate using window coordinates or scaled to specific area.
 * @class PixiApp
 */
function PixiApp(width, height) {
	if (PixiApp.instance)
		throw new Error("Only one PixiApp per app");

	PixiApp.instance=this;

	PIXI.DisplayObjectContainer.call(this);

	var view;

	if (navigator.isCocoonJS)
		view=document.createElement('screencanvas');

	else
		view=document.createElement('canvas');

//	this.renderer=new PIXI.WebGLRenderer(window.innerWidth,window.innerHeight,view);
	this.renderer=new PIXI.autoDetectRenderer(window.innerWidth,window.innerHeight,view);

	console.log("appending child, document: "+document);
	console.log("appending child, document.body: "+document.body);

	document.body.appendChild(this.renderer.view);

	document.body.style.margin=0;
	document.body.style.padding=0;

	document.body.onresize=FunctionUtil.createDelegate(this.onWindowResize,this);
	window.onresize=FunctionUtil.createDelegate(this.onWindowResize,this);

/*	var s=document.createElement("div");
	s.innerHTML="hello";
	s.style.background="#ffffff";
	s.style.position="absolute";
	s.style.left="0";
	s.style.top="30px";

	document.body.appendChild(s);*/

	this.contentScaler=null;

	this.appStage=new PIXI.Stage(0,true);

	//console.log("im: "+this.appStage.interactionManager);

	if (!width || !height)
		this.useNoScaling();

	else
		this.useScaling(width,height);

	FrameTimer.getInstance().addEventListener(FrameTimer.RENDER,this.onAnimationFrame,this);
}

FunctionUtil.extend(PixiApp,PIXI.DisplayObjectContainer);

/**
 * Use scaling mode.
 * @method useScaling
 */
PixiApp.prototype.useScaling=function(w, h) {
	this.removeContent();

	this.contentScaler=new ContentScaler(this);
	this.contentScaler.setContentSize(w,h);
	this.contentScaler.setScreenSize(window.innerWidth,window.innerHeight);
	this.appStage.addChild(this.contentScaler);
}

/**
 * Use no scaling mode.
 * @method useNoScaling
 */
PixiApp.prototype.useNoScaling=function() {
	this.removeContent();

	this.appStage.addChild(this);
}

/**
 * Remove any content.
 * @method removeContent
 * @private
 */
PixiApp.prototype.removeContent=function() {
	if (this.appStage.children.indexOf(this)>=0)
		this.appStage.removeChild(this);

	if (this.contentScaler) {
		this.appStage.removeChild(this.contentScaler)
		this.contentScaler=null;
	}
}

/**
 * Window resize.
 * @method onWindowResize
 * @private
 */
PixiApp.prototype.onWindowResize=function() {
	if (this.contentScaler)
		this.contentScaler.setScreenSize(window.innerWidth,window.innerHeight);

	this.renderer.resize(window.innerWidth,window.innerHeight);

	this.renderer.render(this.appStage);
}

/**
 * Animation frame.
 * @method onAnimationFrame
 * @private
 */
PixiApp.prototype.onAnimationFrame=function() {
	this.renderer.render(this.appStage);
	TWEEN.update();
}

/**
 * Get canvas.
 * @method getCanvas
 */
PixiApp.prototype.getCanvas=function() {
	return this.renderer.view;
}

/**
 * Get stage.
 * @method getStage
 */
PixiApp.prototype.getStage=function() {
	return this.appStage;
}

module.exports=PixiApp;