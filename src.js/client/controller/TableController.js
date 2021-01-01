/**
 * Client.
 * @module client
 */

const CardData=require("../../data/CardData");
const Timeout=require("../../utils/Timeout");

/**
 * Control the table
 * @class TableController
 */
class TableController {
	constructor(eventQueue, view) {
		this.eventQueue = eventQueue;
		this.view = view;

		this.eventQueue.on("seatInfo", this.onSeatInfoMessage);
		this.eventQueue.on("communityCards", this.onCommunityCardsMessage);
		this.eventQueue.on("pocketCards", this.onPocketCardsMessage);
		this.eventQueue.on("dealerButton", this.onDealerButtonMessage);
		this.eventQueue.on("bet", this.onBetMessage);
		this.eventQueue.on("betsToPot", this.onBetsToPotMessage);
		this.eventQueue.on("pot", this.onPotMessage);
		this.eventQueue.on("timer", this.onTimerMessage);
		this.eventQueue.on("action", this.onActionMessage);
		this.eventQueue.on("foldCards", this.onFoldCardsMessage);
		this.eventQueue.on("delay", this.onDelayMessage);
		this.eventQueue.on("clear", this.onClearMessage);
		this.eventQueue.on("payOut", this.onPayOutMessage);
		this.eventQueue.on("fadeTable", this.onFadeTableMessage);
	}

	/**
	 * Fade table.
	 * @method onFadeTableMessage
	 */
	onFadeTableMessage=(m)=>{
		this.view.fadeTable(m.visible, m.direction);
		this.eventQueue.waitFor(this.view, "fadeTableComplete");
	}

	/**
	 * Seat info message.
	 * @method onSeatInfoMessage
	 */
	onSeatInfoMessage=(m)=>{
		var seatView = this.view.getSeatViewByIndex(m.seatIndex);

		seatView.setName(m.name);
		seatView.setChips(m.chips);
		seatView.setActive(m.active);
		seatView.setSitout(m.sitout);
	}

	/**
	 * Seat info message.
	 * @method onCommunityCardsMessage
	 */
	onCommunityCardsMessage=(m)=>{
		let cardView;

		for (let i = 0; i < m.cards.length; i++) {
			let cardData = new CardData(m.cards[i]);
			cardView = this.view.getCommunityCards()[m.firstIndex + i];
			cardView.setCardData(cardData);
			cardView.show(m.animate);
		}

		if (m.animate && cardView)
			this.eventQueue.waitFor(cardView, "animationDone");
	}

	/**
	 * Pocket cards message.
	 * @method onPocketCardsMessage
	 */
	onPocketCardsMessage=(m)=>{
		var seatView = this.view.getSeatViewByIndex(m.seatIndex);
		var i;

		for (i = 0; i < m.cards.length; i++) {
			var cardData = new CardData(m.cards[i]);
			var cardView = seatView.getPocketCards()[m.firstIndex + i];

			if (m.animate)
				this.eventQueue.waitFor(cardView, "animationDone");

			cardView.setCardData(cardData);
			cardView.show(m.animate, 10);
		}
	}

	/**
	 * Dealer button message.
	 * @method onDealerButtonMessage
	 */
	onDealerButtonMessage=(m)=>{
		var dealerButtonView = this.view.getDealerButtonView();

		if (m.seatIndex < 0) {
			dealerButtonView.hide();
		} else {
			if (m.animate)
				this.eventQueue.waitFor(dealerButtonView, "animationDone");

			dealerButtonView.show(m.seatIndex, m.animate);
		}
	};

	/**
	 * Bet message.
	 * @method onBetMessage
	 */
	onBetMessage=(m)=>{
		var seatView = this.view.getSeatViewByIndex(m.seatIndex);
		seatView.getBetChipsView().setValue(m.value);
	};

	/**
	 * Bets to pot.
	 * @method onBetsToPot
	 */
	onBetsToPotMessage=(m)=>{
		var haveChips = false;

		for (var i = 0; i < this.view.seatViews.length; i++)
			if (this.view.seatViews[i].betChips.value > 0)
				haveChips = true;

		if (!haveChips)
			return;

		for (var i = 0; i < this.view.seatViews.length; i++)
			this.view.seatViews[i].betChips.animateIn();

		this.eventQueue.waitFor(this.view.seatViews[9].betChips, "animationDone");
	}

	/**
	 * Pot message.
	 * @method onPot
	 */
	onPotMessage=(m)=>{
		this.view.potView.setValues(m.values);
	};

	/**
	 * Timer message.
	 * @method onTimer
	 */
	onTimerMessage=(m)=>{
		if (m.seatIndex < 0)
			this.view.timerView.hide();

		else {
			this.view.timerView.show(m.seatIndex);
			this.view.timerView.countdown(m.totalTime, m.timeLeft);
		}
	};

	/**
	 * Action message.
	 * @method onAction
	 */
	onActionMessage=(m)=>{
		if (m.seatIndex == null)
			m.seatIndex = 0;

		this.view.seatViews[m.seatIndex].action(m.action);
	};

	/**
	 * Fold cards message.
	 * @method onFoldCards
	 */
	onFoldCardsMessage=(m)=>{
		this.view.seatViews[m.seatIndex].foldCards();

		this.eventQueue.waitFor(this.view.seatViews[m.seatIndex], "animationDone");
	};

	/**
	 * Delay message.
	 * @method onDelay
	 */
	onDelayMessage=(m)=>{
		//console.log("delay for  = " + m.delay);

		let t=new Timeout(m.delay);
		this.eventQueue.waitFor(t,"timeout");
	};

	/**
	 * Clear message.
	 * @method onClear
	 */
	onClearMessage=(m)=>{
		var components = m.getComponents();

		for (var i = 0; i < components.length; i++) {
			switch (components[i]) {
				case ClearMessage.POT:
					{
						this.view.potView.setValues([]);
						break;
					}
				case ClearMessage.BETS:
					{
						for (var s = 0; s < this.view.seatViews.length; s++) {
							this.view.seatViews[s].betChips.setValue(0);
						}
						break;
					}
				case ClearMessage.CARDS:
					{
						for (var s = 0; s < this.view.seatViews.length; s++) {
							for (var c = 0; c < this.view.seatViews[s].pocketCards.length; c++) {
								this.view.seatViews[s].pocketCards[c].hide();
							}
						}

						for (var c = 0; c < this.view.communityCards.length; c++) {
							this.view.communityCards[c].hide();
						}
						break;
					}
				case ClearMessage.CHAT:
					{
						this.view.chatView.clear();
						break;
					}
			}
		}
	}

	/**
	 * Pay out message.
	 * @method onPayOut
	 */
	onPayOutMessage=(m)=>{
		for (var i = 0; i < m.values.length; i++)
			this.view.seatViews[i].betChips.setValue(m.values[i]);

		for (var i = 0; i < this.view.seatViews.length; i++)
			this.view.seatViews[i].betChips.animateOut();

		this.eventQueue.waitFor(this.view.seatViews[0].betChips, "animationDone");
	};
}

module.exports = TableController;