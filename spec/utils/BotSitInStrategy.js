var BotStrategy=require("./BotStrategy");
var StateCompleteMessage=require("../../src/proto/messages/StateCompleteMessage");
var ShowDialogMessage=require("../../src/proto/messages/ShowDialogMessage");
var SeatClickMessage=require("../../src/proto/messages/SeatClickMessage");
var SeatInfoMessage=require("../../src/proto/messages/SeatInfoMessage");
var ButtonClickMessage=require("../../src/proto/messages/ButtonClickMessage");
var ButtonData=require("../../src/proto/data/ButtonData");
var inherits = require("inherits");

/**
 * Sit in at specified seat, with the specified amount of money.
 * @class BotSitInStrategy
 */
function BotSitInStrategy(seatIndex, sitInAmount) {
	BotStrategy.call(this);

	this.seatIndex=seatIndex;
	this.sitInAmount=sitInAmount;
}

inherits(BotSitInStrategy,BotStrategy);

/**
 * Run the strategy.
 * @method run
 */
BotSitInStrategy.prototype.run=function() {
	this.botConnection.addMessageHandler(StateCompleteMessage,this.onStateCompleteMessage,this);
	this.botConnection.addMessageHandler(ShowDialogMessage,this.onShowDialogMessage,this);
	this.botConnection.addMessageHandler(SeatInfoMessage,this.onSeatInfoMessage,this);

	if (this.botConnection.getLastMessageOfType(StateCompleteMessage)) {
		console.log("there is a state complete message already!!!");
		this.onStateCompleteMessage();
	}
}

/**
 * Got a state complete message.
 * @method onStateCompleteMessage
 * @private
 */
BotSitInStrategy.prototype.onStateCompleteMessage=function() {
	console.log("state complete in bot sit in strategy");
	this.botConnection.send(new SeatClickMessage(this.seatIndex));
}

/**
 * Show dialog in strategy.
 * @method onShowDialogMessage
 * @private
 */
BotSitInStrategy.prototype.onShowDialogMessage=function() {
	console.log("show dialog message in strategy");
	this.botConnection.send(new ButtonClickMessage(ButtonData.SIT_IN, this.sitInAmount));
}

/**
 * Set info message in strategy.
 * @method onSeatInfoMessage
 * @private
 */
BotSitInStrategy.prototype.onSeatInfoMessage=function() {
	var seat=this.botConnection.getSeatAt(this.seatIndex);

	if (seat && seat.getChips()==this.sitInAmount)
		this.notifyComplete();
}

module.exports=BotSitInStrategy;