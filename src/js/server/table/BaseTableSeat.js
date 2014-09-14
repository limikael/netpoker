var FunctionUtil = require("../../utils/FunctionUtil");
var EventDispatcher = require("../../utils/EventDispatcher");
var ButtonClickMessage = require("../../proto/messages/ButtonClickMessage");
var ProtoConnection = require("../../proto/ProtoConnection");
var SeatInfoMessage = require("../../proto/messages/SeatInfoMessage");
var ChatMessage = require("../../proto/messages/ChatMessage");

/**
 * Base table seat. This is an abstract class representing a seat at a table.
 * The extending classes modify the behaivour slightly depending on the type
 * of the game, such as gash games, tournaments, etc. 
 *
 * These are long lived objects, in the sense that they are active 
 * as long as the table they belong to is active. 
 *
 * The table seat may be "active" or "inactive". Inactive seats are just
 * placeholders and will be represented in the client by removing the
 * seatplate for the seat. For example, on a four player table, the remaining
 * six seats that cannot be used are the inactive seats.
 *
 * There may or may not be a user associated with the seat. The seated
 * user can be retreived using the getUser function.
 *
 * This class has an associated connection which is the connection to the user
 * currently controlling this seat. Note that the same user may be connected
 * to the same table from several clients, but each user may only have one
 * connection that controls a seat at a given time.
 * @class BaseTableSeat
 * @extends EventDispatcher
 */
function BaseTableSeat(table, seatIndex, active) {
	EventDispatcher.call(this);

	this.table = table;
	this.seatIndex = seatIndex;
	this.active = active;

	this.protoConnection = null;
}

FunctionUtil.extend(BaseTableSeat, EventDispatcher);

/**
 * Is tihs seat active?
 * @method isActive
 */
BaseTableSeat.prototype.isActive = function() {
	return this.active;
}

/**
 * Get seat index for this seat?
 * @method getSeatIndex
 */
BaseTableSeat.prototype.getSeatIndex = function() {
	return this.seatIndex;
}

/**
 * Set the protoConnection currently associated with this seat.
 * @method setProtoConnection
 * @param {ProtoConnection} protoConnection
 * @protected
 */
BaseTableSeat.prototype.setProtoConnection = function(protoConnection) {
	if (this.protoConnection) {
		this.protoConnection.removeMessageHandler(ButtonClickMessage.TYPE, this.onButtonClickMessage, this);
		this.protoConnection.off(ProtoConnection.CLOSE, this.onProtoConnectionClose, this);
		this.protoConnection.removeMessageHandler(ChatMessage.TYPE, this.onChat, this);
	}

	this.protoConnection = protoConnection;

	if (this.protoConnection) {
		this.protoConnection.addMessageHandler(ButtonClickMessage.TYPE, this.onButtonClickMessage, this);
		this.protoConnection.on(ProtoConnection.CLOSE, this.onProtoConnectionClose, this);
		this.protoConnection.addMessageHandler(ChatMessage.TYPE, this.onChat, this);
	}
}

/**
 * Get user currently seated as this BaseTableSeat.
 *
 * This is an abstract function, it is up to the concrete class
 * extending this class to actually implement a mechanism for
 * managing what user that is seated at this seat.
 * @method getUser
 */
BaseTableSeat.prototype.getUser = function() {
	throw new Error("abstract");
}

/**
 * Get proto connection.
 * @method getProtoConnection
 */
BaseTableSeat.prototype.getProtoConnection = function() {
	return this.protoConnection;
}

/**
 * Chat message.
 * @method onChat
 * @private
 */
BaseTableSeat.prototype.onChat = function(message) {
	this.table.chat(this.getUser(), message.text);
}

/**
 * Button click message.
 * @method onButtonClickMessage
 * @private
 */
BaseTableSeat.prototype.onButtonClickMessage = function(message) {
	this.trigger(ButtonClickMessage.TYPE, message);
}

/**
 * Button click message.
 * @method onProtoConnectionClose
 * @private
 */
BaseTableSeat.prototype.onProtoConnectionClose = function() {
	this.setProtoConnection(null);
	this.trigger(ProtoConnection.CLOSE);
}

/**
 * Get table.
 * @method getTable
 */
BaseTableSeat.prototype.getTable = function() {
	return this.table;
}

/**
 * Get services.
 * @method getServices
 */
BaseTableSeat.prototype.getServices = function() {
	return this.table.getServices();
}

/**
 * Send a message to the connection currently associated with this seat.
 * @method send
 * @param {Object} message The message to send.
 */
BaseTableSeat.prototype.send = function(message) {
	if (this.protoConnection)
		this.protoConnection.send(message);
}

/**
 * Get chips.
 * @method getChips
 */
BaseTableSeat.prototype.getChips = function() {
	throw new Error("abstract");
}

/**
 * Is this table seat sitting out?
 * @method isSitout
 */
BaseTableSeat.prototype.isSitout = function() {
	throw new Error("abstract");
}

/**
 * Get SeatInfoMessage representing this seat.
 *
 * Implementing classes may want to extend this function to modify
 * how the seat appears depening on details of the game.
 * @method getSeatInfoMessage
 * @return {SeatInfoMessage}
 */
BaseTableSeat.prototype.getSeatInfoMessage = function() {
	var m = new SeatInfoMessage(this.seatIndex);

	m.setActive(this.isActive());

	if (this.getUser()) {
		var user = this.getUser();

		m.setName(user.getName());
		m.setSitout(this.isSitout());

		if (this.getChips() == 0)
			m.chips = "ALL IN";

		else
			m.chips = this.getChips();
	}

	return m;
}

module.exports = BaseTableSeat;