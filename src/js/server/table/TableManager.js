var Backend = require("../../../../src/js/server/backend/Backend");
var EventDispatcher = require("../../../../src/js/utils/EventDispatcher");
var FunctionUtil = require("../../../../src/js/utils/FunctionUtil");
var Table = require("./Table");

/**
 * Manage list of current cash game tables.
 * @class TableManager
 */
function TableManager(services) {
	EventDispatcher.call(this);

	this.services = services;

	this.tables = [];
}

FunctionUtil.extend(TableManager, EventDispatcher);

TableManager.INITIALIZED = "initialized";

/**
 * Initialize.
 * @method initialize
 */
TableManager.prototype.initialize = function() {
	this.services.getBackend().call(Backend.GET_TABLE_LIST).then(
		this.onInitializeTableListSuccess.bind(this),
		this.onInitializeTableListError.bind(this)
	);
}

/**
 * Initial table fetch success.
 * @method onInitializeTableListSuccess
 * @private
 */
TableManager.prototype.onInitializeTableListSuccess = function(result) {
	var i;

	for (i = 0; i < result.tables.length; i++) {
		var tableData = result.tables[i];
		var table = new Table(this.services, tableData);
		this.tables.push(table);
	}

	this.trigger(TableManager.INITIALIZED);
}

/**
 * Initial table fetch error.
 * @method onInitializeTableListError
 * @private
 */
TableManager.prototype.onInitializeTableListError = function(errorMessage) {
	throw "Error fetching table list: " + errorMessage;
}

/**
 * Find a table by id.
 * @method getTableById
 */
TableManager.prototype.getTableById = function(id) {
	for (var i = 0; i < this.tables.length; i++)
		if (this.tables[i].getId() == id)
			return this.tables[i];

	return null;
}

/**
 * Hard close.
 * @method close
 */
TableManager.prototype.close = function() {
	for (var i = 0; i < this.tables.length; i++)
		this.tables[i].close();
}

module.exports = TableManager;