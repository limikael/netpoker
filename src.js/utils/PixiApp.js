const ContentScaler=require("./ContentScaler");

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
		this.element=element;
		this.element.appendChild(this.app.view);
		this.onWindowResize();
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