var FunctionUtil = require("../../utils/FunctionUtil");
var EventDispatcher = require("../../utils/EventDispatcher");
var BaseTableSeat = require("./BaseTableSeat");

/**
 * A table seat.
 * @class TableSeat
 */
function TableSeat(table, seatIndex, active) {
	BaseTableSeat.call(this, table, seatIndex, active);
}

FunctionUtil.extend(TableSeat, BaseTableSeat);

module.exports = TableSeat;