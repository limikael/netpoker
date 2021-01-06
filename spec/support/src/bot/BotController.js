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
		var seatModel = this.model.getSeatModelBySeatIndex(m.getSeatIndex());
		var seatCards = seatModel.getCards();

		for (var i = 0; i < m.getCards().length; i++) {
			var cardData = m.getCards()[i];
			var cardIndex = m.getFirstIndex() + i;

			seatCards[cardIndex] = cardData;
		}
	}

	onBetMessage=(m)=> {
		var seatModel = this.model.getSeatModelBySeatIndex(m.getSeatIndex());

		seatModel.setBet(m.getValue());
	}

	onCommunityCardsMessage=(m)=> {
		for (var i = 0; i < m.getCards().length; i++) {
			var c = m.getCards()[i];

			this.model.getCommunityCards()[m.getFirstIndex() + i] = c;
		}
	}

	onFoldCardsMessage=(m)=> {
		var seatModel = this.model.getSeatModelBySeatIndex(m.getSeatIndex());

		seatModel.clearCards();
	}

	onDealerButtonMessage=(m)=> {
		this.model.setDealerButtonPosition(m.seatIndex);
	}

	onPotMessage=(m)=> {
		this.model.setPots(m.getValues());
	}

	onBetsToPotMessage=(m)=> {
		for (i = 0; i < this.model.seatModels.length; i++) {
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