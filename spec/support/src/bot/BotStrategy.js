/**
 * Abstract class for something that the bot can do.
 * Apply it using botConnection.runStragety(strategy)
 * @class BotStrategy
 */
class BotStrategy {
	constructor() {
		this.botConnection=null;
		this.bot=null;
	}

	setBotConnection(botConnection) {
		this.botConnection=botConnection;
		this.bot=botConnection;
	}

	async run() {
		throw new Error("abstract");
	}
}

module.exports = BotStrategy;