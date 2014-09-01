var FunctionUtil = require("../../utils/FunctionUtil");
var EventDispatcher = require("../../utils/EventDispatcher");

/**
 * A user seated at a table.
 * @class TableSeatUser
 */
function TableSeatUser(tableSeat, user) {
	this.tableSeat = tableSeat;
	this.user = user;
}

FunctionUtil.extend(TableSeatUser, EventDispatcher);

/**
 * Get seated user.
 * @method getUser
 */
TableSeatUser.prototype.getUser = function() {
	return this.user;
}

module.exports = TableSeatUser;