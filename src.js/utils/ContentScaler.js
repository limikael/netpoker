class ContentScaler extends PIXI.Container {
	constructor(content) {
		super();

		this.contentWidth = 100;
		this.contentHeight = 100;
		this.screenWidth = 100;
		this.screenHeight = 100;

		if (content)
			this.setContent(content);

		this.updateScale();
	}

	setContentSize(contentWidth, contentHeight) {
		this.contentWidth = contentWidth;
		this.contentHeight = contentHeight;
		this.updateScale();
	}

	setScreenSize(screenWidth, screenHeight) {
		this.screenWidth = screenWidth;
		this.screenHeight = screenHeight;
		this.updateScale();
	}

	setContent(content) {
		if (this.content)
			throw new Error("Content already set");

		this.content=content;
		this.addChild(this.content);

		this.updateScale();
	}

	updateScale() {
		if (!this.content)
			return;

		let scale;

		if (this.screenWidth / this.contentWidth < this.screenHeight / this.contentHeight)
			scale = this.screenWidth / this.contentWidth;

		else
			scale = this.screenHeight / this.contentHeight;		

		this.content.scale.x = scale;
		this.content.scale.y = scale;

		let scaledWidth = this.contentWidth * scale;
		let scaledHeight = this.contentHeight * scale;		

		this.content.position.x = (this.screenWidth - scaledWidth) / 2;
		this.content.position.y = (this.screenHeight - scaledHeight) / 2;
	}
}

module.exports=ContentScaler;