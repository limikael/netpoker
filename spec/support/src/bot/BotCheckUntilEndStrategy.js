const BotStrategy = require("./BotStrategy");
const TickLoopRunner = require("../utils/TickLoopRunner");
/**
 * Checks until show/muck state.
 * @class BotSitInStrategy
 */
class BotCheckUntilEndStrategy extends BotStrategy {
	async run() {
		while (true) {
			await this.bot.waitForButtons();

			if (bot.isActionAvailable("call"))
				this.bot.act("call");

			else if (bot.isActionAvailable("check"))
				this.bot.act("check");

			else
				throw new Error("no check nor call");

			await TickLoopRunner.runTicks();
			if (this.bot.getMessagesOfType("payOut").length>0)
				return;
		}
	}
}

module.exports = BotCheckUntilEndStrategy;