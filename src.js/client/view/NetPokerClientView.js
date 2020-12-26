class NetPokerClientView extends PIXI.Container {
	constructor(client) {
		super();

		this.client=client;
		this.resources=this.client.getResources();

		let table=this.resources.createSprite("tableBackground");
		this.addChild(table);
	}
}

module.exports=NetPokerClientView;