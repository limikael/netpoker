const ContentScaler=require("./ContentScaler");
const TWEEN = require('@tweenjs/tween.js');

class PixiApp extends PIXI.Container {
	constructor(contentWidth, contentHeight) {
		super();

		this.app=new PIXI.Application();
		this.app.renderer.autoDensity=true;
		this.app.view.style.position="absolute";
		this.app.view.style.top=0;
		this.app.view.style.left=0;

		this.contentScaler=new ContentScaler(this);
		this.contentScaler.setContentSize(contentWidth,contentHeight);
		this.app.stage.addChild(this.contentScaler);

		window.addEventListener("resize",this.onWindowResize);
	}

	attach(element) {
		this.app.ticker.add(this.onAppTicker);

		this.element=element;
		this.element.appendChild(this.app.view);
		this.onWindowResize();
	}

	onAppTicker=(delta)=>{
		TWEEN.update(performance.now());
//		TWEEN.update(Date.now());
	}

	onWindowResize=()=>{
		if (!this.element)
			return;

		this.contentScaler.setScreenSize(
			this.element.clientWidth,
			this.element.clientHeight
		);

		this.app.renderer.resize(
			this.element.clientWidth,
			this.element.clientHeight
		);
	}
}

module.exports=PixiApp;