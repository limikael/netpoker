var BotStrategy=require("./BotStrategy");

/**
 * Sit in at specified seat, with the specified amount of money.
 * @class BotSitInStrategy
 */
class BotSitInStrategy extends BotStrategy {
	constructor(seatIndex, sitInAmount) {
		super();

		this.seatIndex=seatIndex;
		this.sitInAmount=sitInAmount;
	}

	async run() {
		if (this.bot.getLastMessageOfType("stateComplete"))
			throw new Error("already seen state complete");

		await this.bot.waitForMessage("stateComplete");
		this.bot.send("seatClick",{
			seatIndex: this.seatIndex
		});

		await this.bot.waitForMessage("showDialog");
		this.bot.send("buttonClick",{
			button: "sitIn",
			value: this.sitInAmount
		});

		while (this.bot.getSeatAt(this.seatIndex).getChips()!=this.sitInAmount)
			await this.bot.waitForMessage("seatInfo");
	}
}

module.exports=BotSitInStrategy;