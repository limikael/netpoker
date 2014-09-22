var BotStrategy=require("./BotStrategy");
var FunctionUtil=require("../../src/js/utils/FunctionUtil");
var StateCompleteMessage=require("../../src/js/proto/messages/StateCompleteMessage");
var ShowDialogMessage=require("../../src/js/proto/messages/ShowDialogMessage");
var SeatClickMessage=require("../../src/js/proto/messages/SeatClickMessage");
var SeatInfoMessage=require("../../src/js/proto/messages/SeatInfoMessage");
var ButtonClickMessage=require("../../src/js/proto/messages/ButtonClickMessage");
var ButtonData=require("../../src/js/proto/data/ButtonData");

/**
 * Sit in at specified seat, with the specified amount of money.
 * @class BotSitInStrategy
 */
function BotSitInStrategy(seatIndex, sitInAmount) {
	BotStrategy.call(this);

	this.seatIndex=seatIndex;
	this.sitInAmount=sitInAmount;
}

FunctionUtil.extend(BotSitInStrategy,BotStrategy);

/**
 * Run the strategy.
 * @method run
 */
BotStrategy.prototype.run=function() {
	this.botConnection.addMessageHandler(StateCompleteMessage,this.onStateCompleteMessage,this);
	this.botConnection.addMessageHandler(ShowDialogMessage,this.onShowDialogMessage,this);
	this.botConnection.addMessageHandler(SeatInfoMessage,this.onSeatInfoMessage,this);
}

/**
 * Got a state complete message.
 * @method onStateCompleteMessage
 * @private
 */
BotStrategy.prototype.onStateCompleteMessage=function() {
	console.log("state complete in bot sit in strategy");
	this.botConnection.send(new SeatClickMessage(this.seatIndex));
}

/**
 * Show dialog in strategy.
 * @method onShowDialogMessage
 * @private
 */
BotStrategy.prototype.onShowDialogMessage=function() {
	console.log("show dialog message in strategy");
	this.botConnection.send(new ButtonClickMessage(ButtonData.SIT_IN, this.sitInAmount));
}

/**
 * Set info message in strategy.
 * @method onSeatInfoMessage
 * @private
 */
BotStrategy.prototype.onSeatInfoMessage=function() {
	var seat=this.botConnection.getSeatAt(this.seatIndex);

	if (seat && seat.getChips()==this.sitInAmount)
		this.notifyComplete();
}

module.exports=BotSitInStrategy;