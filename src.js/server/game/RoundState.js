/**
 * Server.
 * @module server
 */

var GameState = require("./GameState");
var CardData = require("../../data/CardData");
var GameSeatPrompt = require("./GameSeatPrompt");
var ShowMuckState = require("./ShowMuckState");

/**
 * Manage a round of beting.
 * @class RoundState
 */
class RoundState extends GameState {
	constructor() {
		super();

		this.prompt = null;

		// This is index in the gameSeats array in the game object,
		// not the seatIndex.
		this.gameSeatIndexToSpeak = 0;
		this.spokenAtCurrentBet = [];
		this.raiseTimes = 0;

		//console.log("********* entering round state...");

		this.hasRun = false;
	}

	/**
	 * Run the state.
	 * @method run
	 */
	run() {
		if (this.hasRun)
			throw new Exception("can only run each state once");

		this.hasRun = true;

		// Heads up.
		if (!this.hasDealtPocketCards() && this.game.getGameSeats().length==2)
			this.gameSeatIndexToSpeak=1;

		if (!this.hasDealtPocketCards()) {
			this.dealPocketCards();
		} else {
			this.dealCommunityCards();
		}

		//console.log("number of players with chips: " + this.getNumberOfPlayersWithChips());

		// In case there is only one player left with chips, i.e. all others
		// are all in, just go to the next state.
		if (this.getNumberOfPlayersWithChips() < 2) {
			if (this.game.getTotalBets()) {
				this.returnExcessiveBets();
				this.betsToPot();
			}

			if (this.game.getCommunityCards().length == 5)
				this.game.setGameState(new ShowMuckState());

			else
				this.game.setGameState(new RoundState());

			return;
		}

		this.ensureGameSeatIndexToSpeakNotFolded();

		for (var g = 0; g < this.game.getGameSeats().length; g++) {
			var gameSeat = this.game.getGameSeats()[g];
			gameSeat.disableAllPresets();
		}

		this.ask();
	}

	/**
	 * Ask next player.
	 * @method ask
	 */
	ask() {
		//console.log("********** asking");

		var gameSeat = this.game.getGameSeats()[this.gameSeatIndexToSpeak];

		if (!gameSeat.getChips()) {
			this.spokenAtCurrentBet.push(gameSeat);
			this.askDone();
			return;
		}

		this.prompt = new GameSeatPrompt(gameSeat);

		this.prompt.addButton("fold");

		if (this.canCheck(gameSeat)) {
			this.prompt.setDefaultButton("check");
			this.prompt.addButton("check");
		} else {
			this.prompt.setDefaultButton("fold");
			this.prompt.addButton("call", this.getCostToCall(gameSeat));
		}

		if (this.canRaise(gameSeat)) {
			var minRaise = this.getMinRaiseTo(gameSeat);
			var maxRaise = this.getMaxRaiseTo(gameSeat);

			if (this.getHighestBet() == 0)
				this.prompt.addButton("bet", minRaise);
			else
				this.prompt.addButton("raise", minRaise);

			if (minRaise != maxRaise) {
				this.prompt.setSliderValues(this.prompt.getLastButtonIndex(), maxRaise);
			}
		}

		this.updateAndSendPresets();

		this.prompt.on("complete", this.onPromptComplete, this);
		this.prompt.ask();
	}

	/**
	 * Update and send presets.
	 * @method updateAndSendPresets
	 * @private
	 */
	updateAndSendPresets() {
		for (var g = 0; g < this.game.getGameSeats().length; g++) {
			var gameSeat = this.game.getGameSeats()[g];

			var oldPreset = gameSeat.getCurrentPreset();
			var oldPresetValue = gameSeat.getCurrentPresetValue();
			gameSeat.disableAllPresets();

			if (!gameSeat.isFolded()) {
				if (this.spokenAtCurrentBet.indexOf(gameSeat) < 0) {
					gameSeat.enablePreset("fold");
					gameSeat.enablePreset("callAny");

					if (this.canCheck(gameSeat)) {
						gameSeat.enablePreset("check");
						gameSeat.enablePreset("checkFold");
					} else {
						if (oldPreset == "checkFold")
							gameSeat.setCurrentPreset("fold");

						gameSeat.enablePreset("call", this.getCostToCall(gameSeat))
					}
				}
			}

			if (gameSeat.isPresetValid(oldPreset, oldPresetValue))
				gameSeat.setCurrentPreset(oldPreset, oldPresetValue);

			if (gameSeat == this.game.getGameSeats()[this.gameSeatIndexToSpeak])
				gameSeat.send("presetButtons");

			else
				gameSeat.sendPresets();
		}
	}

	/**
	 * Prompt complete.
	 * @method onPromptComplete
	 * @private
	 */
	onPromptComplete=()=>{
		var prompt = this.prompt;

		this.prompt.off(GameSeatPrompt.COMPLETE, this.onPromptComplete, this);
		this.prompt = null;

		var gameSeat = this.game.getGameSeats()[this.gameSeatIndexToSpeak];

		if (prompt.isRaiseBet() && this.canRaise(gameSeat)) {
			this.spokenAtCurrentBet = [gameSeat];

			var value = prompt.getValue();
			if (isNaN(value))
				value = this.getMinRaiseTo(gameSeat);

			if (value < this.getMinRaiseTo(gameSeat))
				value = this.getMinRaiseTo(gameSeat);

			if (value > this.getMaxRaiseTo(gameSeat))
				value = this.getMaxRaiseTo(gameSeat);

			if (prompt.getButton() == "raise")
				this.game.send("raise",{
					seatIndex: gameSeat.getSeatIndex(),
					action: "raise"
				});

			else
				this.game.send("bet",{
					seatIndex: gameSeat.getSeatIndex(),
					action: "bet"
				});

			gameSeat.makeBet(value - gameSeat.getBet());
			this.raiseTimes++;

			this.askDone();
		} else if (prompt.isCheckCall()) {
			this.spokenAtCurrentBet.push(gameSeat);

			if (this.canCheck(gameSeat))
				this.game.send("action",{
					seatIndex: gameSeat.getSeatIndex(),
					action: "check"
				});

			else
				this.game.send("action",{
					seatIndex: gameSeat.getSeatIndex(),
					action: "call"
				});

			gameSeat.makeBet(this.getCostToCall(gameSeat));
			this.askDone();
		} else {
			gameSeat.fold();
			this.askDone();
		}
	}

	/**
	 * Get max raise.
	 * @method getMaxRaiseTo
	 * @private
	 */
	getMaxRaiseTo(gameSeat) {
		var cand = gameSeat.getTableSeat().getChips() + gameSeat.getBet();

		return cand;
	}

	/**
	 * Get min raise.
	 * @method getMinRaiseTo
	 * @private
	 */
	getMinRaiseTo(gameSeat) {
		var cand = this.getHighestBet() + this.game.getTable().getStake();

		if (cand > gameSeat.getTableSeat().getChips() + gameSeat.getBet())
			cand = gameSeat.getTableSeat().getChips() + gameSeat.getBet();

		return cand;
	}

	/**
	 * Get min raise.
	 * @method getMinRaiseTo
	 * @private
	 */
	canRaise(gameSeat) {
		if (this.raiseTimes >= 4)
			return false;

		if (gameSeat.getTableSeat().getChips() <= this.getCostToCall(gameSeat))
			return false;

		for (var i = 0; i < this.game.getGameSeats().length; i++) {
			var gs = this.game.getGameSeats()[i];
			if (!gs.isFolded())
				if (gs.getTableSeat().getChips() > 0)
					if (gs != gameSeat)
						return true;
		}

		return false;
	}

	/**
	 * Get number of players with chips still in the game.
	 * @method getNumberOfPlayersWithChips
	 * @private
	 */
	getNumberOfPlayersWithChips() {
		var cnt = 0;

		for (var g = 0; g < this.game.getGameSeats().length; g++) {
			var gameSeat = this.game.getGameSeats()[g];

			if (!gameSeat.isFolded() && gameSeat.getChips() > 0)
				cnt++;
		}

		return cnt;
	}

	/**
	 * Deal pocket cards.
	 * @method dealPocketCards
	 */
	dealPocketCards() {
		//console.log("dealing pocket cards");

		for (var i = 0; i < 2; i++) {
			for (var g = 0; g < this.game.getGameSeats().length; g++) {
				var card = this.game.getNextCard();

				var gameSeat = this.game.getGameSeats()[g];
				gameSeat.addPocketCard(card);

				// Send hidden
				this.game.sendExceptSeat(gameSeat,"pocketCards",{
					seatIndex: gameSeat.getSeatIndex(),
					firstIndex: i,
					animate: true,
					cards: [CardData.HIDDEN]
				});

				// Send shown.
				gameSeat.send("pocketCards", {
					seatIndex: gameSeat.getSeatIndex(),
					firstIndex: i,
					animate: true,
					cards: [card.getValue()]
				});
			}
		}
	}

	/**
	 * Deal community cards.
	 * @method dealCommunityCards
	 */
	dealCommunityCards() {
		//console.log("dealing community cards");

		var numCards = 0;

		if (this.game.getCommunityCards().length == 0) {
			numCards = 3;
		} else {
			numCards = 1;
		}

		for (var i = 0; i < numCards; i++) {
			let index=this.game.getCommunityCards().length;

			var c = this.game.getNextCard();
			this.game.getCommunityCards().push(c);

			this.game.send("communityCards",{
				animate: true,
				firstIndex: index,
				cards: [c.getValue()]
			});
		}
	}

	/**
	 * Have we dealt pocket cards?
	 * @method hasDealtPocketCards
	 * @private
	 */
	hasDealtPocketCards() {
		let dealt = false;

		for (var i = 0; i < this.game.getGameSeats().length; i++) {
			var gameSeat = this.game.getGameSeats()[i];

			if (gameSeat.getPocketCards().length)
				dealt = true;
		}

		return dealt;
	}

	/**
	 * Ensure gameSeatIndexToSpeak has not folded.
	 * @method ensureGameSeatIndexToSpeakNotFolded
	 * @private
	 */
	ensureGameSeatIndexToSpeakNotFolded() {
		if (this.gameSeatIndexToSpeak >= this.game.getGameSeats().length)
			this.gameSeatIndexToSpeak = 0;

		while (this.game.getGameSeats()[this.gameSeatIndexToSpeak].isFolded()) {
			this.gameSeatIndexToSpeak++;
			if (this.gameSeatIndexToSpeak >= this.game.getGameSeats().length)
				this.gameSeatIndexToSpeak = 0;
		}
	}

	/**
	 * Get highest bet.
	 * @method getHighestBet
	 * @private
	 */
	getHighestBet() {
		var high = 0;

		for (var g = 0; g < this.game.getGameSeats().length; g++) {
			var gameSeat = this.game.getGameSeats()[g];

			if (gameSeat.getBet() > high)
				high = gameSeat.getBet();
		}

		return high;
	}

	/**
	 * Can this gameSeat check.
	 * @method canCheck
	 * @private
	 */
	canCheck(gameSeat) {
		return gameSeat.getBet() >= this.getHighestBet();
	}

	/**
	 * Get cost to call.
	 * @method getCostToCall
	 * @private
	 */
	getCostToCall(gameSeat) {
		var cand = this.getHighestBet() - gameSeat.getBet();

		if (cand > gameSeat.getChips())
			cand = gameSeat.getChips();

		return cand;
	}

	/**
	 * Increase gameSeatIndexToSpeak and make sure
	 * it is a player still in the game.
	 * @method advanceSpeaker
	 * @private
	 */
	advanceSpeaker() {
		this.gameSeatIndexToSpeak++;

		if (this.gameSeatIndexToSpeak >= this.game.getGameSeats().length)
			this.gameSeatIndexToSpeak = 0;

		this.ensureGameSeatIndexToSpeakNotFolded();
	}

	/**
	 * After asking.
	 * @method askDone
	 * @private
	 */
	askDone() {
		if (this.game.getNumPlayersRemaining() == 1) {
			this.disableAndSendAllPresets();
			this.returnExcessiveBets();
			this.betsToPot();
			this.game.setGameState(new ShowMuckState());
		} else if (this.allHasSpoken()) {
			this.disableAndSendAllPresets();
			this.returnExcessiveBets();
			this.betsToPot();

			if (this.game.getCommunityCards().length == 5)
				this.game.setGameState(new ShowMuckState());

			else {
				this.game.setGameState(new RoundState());
			}
		} else {
			this.advanceSpeaker();
			this.ask();
		}
	}

	/**
	 * Disable and send all presets.
	 * @method disableAndSendAllPresets
	 */
	disableAndSendAllPresets() {
		for (var g = 0; g < this.game.getGameSeats().length; g++) {
			var gameSeat = this.game.getGameSeats()[g];

			gameSeat.disableAllPresets();
			gameSeat.sendPresets();
		}
	}

	/**
	 * Has all the remaining players spoken about the bet?
	 * @method allHasSpoken
	 * @private
	 */
	allHasSpoken() {
		for (var g = 0; g < this.game.getGameSeats().length; g++) {
			var gameSeat = this.game.getGameSeats()[g];

			if (!gameSeat.isFolded() && this.spokenAtCurrentBet.indexOf(gameSeat) < 0)
				return false;
		}

		return true;
	}

	/**
	 * Send bets to the pot.
	 * @method betsToPot
	 */
	betsToPot() {
		for (var g = 0; g < this.game.getGameSeats().length; g++) {
			var gameSeat = this.game.getGameSeats()[g];
			gameSeat.betToPot();
		}

		this.game.send("betsToPot");
		this.game.send("pot",{
			values: this.game.getPots()
		});
	}


	/**
	 * Return excessive bets.
	 * @method returnExcessiveBets
	 */
	returnExcessiveBets() {
		var bets = [];

		for (var g = 0; g < this.game.getGameSeats().length; g++) {
			var gameSeat = this.game.getGameSeats()[g];
			bets.push(gameSeat.getBet());
		}

		bets.sort();
		bets.reverse();

		var secondHighest = bets[1];

		for (var g = 0; g < this.game.getGameSeats().length; g++) {
			var gameSeat = this.game.getGameSeats()[g];
			if (gameSeat.getBet() > secondHighest)
				gameSeat.returnBet(gameSeat.getBet() - secondHighest);
		}
	}
}

module.exports = RoundState;