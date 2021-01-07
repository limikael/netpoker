class BotController {
	constructor(model) {
		this.model = model;
	}

	setConnection(connection) {
		this.connection = connection;
		this.connection.on("seatInfo", this.onSeatInfoMessage);
		this.connection.on("pocketCards", this.onPocketCardsMessage);
		this.connection.on("buttons", this.onButtonsMessage);
		this.connection.on("bet", this.onBetMessage);
		this.connection.on("communityCards", this.onCommunityCardsMessage);
		this.connection.on("foldCards", this.onFoldCardsMessage);
		this.connection.on("dealerButton", this.onDealerButtonMessage);
		this.connection.on("pot", this.onPotMessage);
		this.connection.on("betsToPot", this.onBetsToPotMessage);
		this.connection.on("handInfo", this.onHandInfoMessage);
		this.connection.on("checkbox", this.onCheckboxMessage);
	}

	onSeatInfoMessage=(m)=> {
		var seatModel = this.model.getSeatModelBySeatIndex(m.seatIndex);

		seatModel.setName(m.name);
		seatModel.setChips(m.chips);
	}

	onButtonsMessage=(m)=>{
		this.model.setButtons(m.buttons);
	}

	onPocketCardsMessage=(m)=> {
		var seatModel = this.model.getSeatModelBySeatIndex(m.seatIndex);
		var seatCards = seatModel.getCards();

		for (var i = 0; i < m.cards.length; i++) {
			var cardData = m.cards[i];
			var cardIndex = m.firstIndex + i;

			seatCards[cardIndex] = cardData;
		}
	}

	onBetMessage=(m)=> {
		var seatModel = this.model.getSeatModelBySeatIndex(m.seatIndex);

		seatModel.setBet(m.value);
	}

	onCommunityCardsMessage=(m)=> {
		for (var i = 0; i < m.cards.length; i++) {
			var c = m.cards[i];

			this.model.getCommunityCards()[m.firstIndex + i] = c;
		}
	}

	onFoldCardsMessage=(m)=> {
		var seatModel = this.model.getSeatModelBySeatIndex(m.getSeatIndex());

		seatModel.clearCards();
	}

	onDealerButtonMessage=(m)=> {
		console.log("*********delaer button message in bot");
		console.log(m);
		this.model.setDealerButtonPosition(m.seatIndex);
	}

	onPotMessage=(m)=> {
		this.model.setPots(m.values);
	}

	onBetsToPotMessage=(m)=> {
		for (let i = 0; i < this.model.seatModels.length; i++) {
			var seatModel = this.model.seatModels[i];
			seatModel.setBet(0);
		}
	}

	onHandInfoMessage=(m)=> {
		this.model.setHandInfo(m.text);
	}

	onCheckboxMessage=(m)=> {
		this.model.setSetting(m.id, m.checked);
	}
}

module.exports = BotController;