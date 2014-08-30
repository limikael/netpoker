var PIXI=require("pixi.js");
var FunctionUtil=require("../utils/FunctionUtil");

function ContentScaler(content) {
	PIXI.DisplayObjectContainer.call(this);

	this.contentWidth=100;
	this.contentHeight=100;

	this.screenWidth=100;
	this.screenHeight=100;

	this.theMask=null;

	if (content)
		this.setContent(content);
}

FunctionUtil.extend(ContentScaler,PIXI.DisplayObjectContainer);

ContentScaler.prototype.setContent=function(content) {
	this.content=content;

	this.addChild(this.content);

	if (this.theMask) {
		this.removeChild(this.theMask);
		this.theMask=null;
	}

	this.theMask=new PIXI.Graphics();
	//this.addChild(this.theMask);

	this.updateScale();
}

ContentScaler.prototype.setContentSize=function(contentWidth, contentHeight) {
	this.contentWidth=contentWidth;
	this.contentHeight=contentHeight;

	this.updateScale();
}

ContentScaler.prototype.setScreenSize=function(screenWidth, screenHeight) {
	this.screenWidth=screenWidth;
	this.screenHeight=screenHeight;

	this.updateScale();
}

ContentScaler.prototype.updateScale=function() {
	var scale;

	if (this.screenWidth/this.contentWidth<this.screenHeight/this.contentHeight)
		scale=this.screenWidth/this.contentWidth;

	else
		scale=this.screenHeight/this.contentHeight;

	this.content.scale.x=scale;
	this.content.scale.y=scale;

	var scaledWidth=this.contentWidth*scale;
	var scaledHeight=this.contentHeight*scale;

	this.content.position.x=(this.screenWidth-scaledWidth)/2;
	this.content.position.y=(this.screenHeight-scaledHeight)/2;

	var r=new PIXI.Rectangle(this.content.position.x,this.content.position.y,scaledWidth,scaledHeight);
	var right=r.x+r.width;
	var bottom=r.y+r.height;

	this.theMask.clear();
	this.theMask.beginFill();
	this.theMask.drawRect(0,0,this.screenWidth,r.y);
	this.theMask.drawRect(0,0,r.x,this.screenHeight);
	this.theMask.drawRect(right,0,this.screenWidth-right,this.screenHeight);
	this.theMask.drawRect(0,bottom,this.screenWidth,this.screenHeight-bottom);
	this.theMask.endFill();
}

module.exports=ContentScaler;