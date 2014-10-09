var Backend = require("../../server/backend/Backend");
var EventDispatcher = require("../../utils/EventDispatcher");
var FunctionUtil = require("../../utils/FunctionUtil");
var CashGameTable = require("./CashGameTable");

/**
 * Manage list of current cash game tables.
 * @class CashGameManager
 */
function CashGameManager(services) {
	EventDispatcher.call(this);

	this.services = services;

	this.tables = [];

	this.fixedDeck = null;
}

FunctionUtil.extend(CashGameManager, EventDispatcher);

CashGameManager.INITIALIZED = "initialized";

/**
 * Initialize.
 * @method initialize
 */
CashGameManager.prototype.initialize = function() {
	this.services.getBackend().call(Backend.GET_TABLE_LIST).then(
		this.onInitializeTableListSuccess.bind(this),
		this.onInitializeTableListError.bind(this)
	);
}

/**
 * Use fixed deck for debugging.
 * @method useFixedDeck
 */
CashGameManager.prototype.useFixedDeck = function(deck) {
	this.fixedDeck = deck;

	for (var i=0; i<this.tables.length; i++)
		this.tables[i].useFixedDeck(deck);
}

/**
 * Initial table fetch success.
 * @method onInitializeTableListSuccess
 * @private
 */
CashGameManager.prototype.onInitializeTableListSuccess = function(result) {
	var i;

	for (i = 0; i < result.tables.length; i++) {
		var tableData = result.tables[i];
		var table = new CashGameTable(this.services, tableData);

		if (this.fixedDeck)
			table.useFixedDeck(this.fixedDeck);

		this.tables.push(table);
	}

	this.trigger(CashGameManager.INITIALIZED);
}

/**
 * Initial table fetch error.
 * @method onInitializeTableListError
 * @private
 */
CashGameManager.prototype.onInitializeTableListError = function(errorMessage) {
	throw "Error fetching table list: " + errorMessage;
}

/**
 * Find a table by id.
 * @method getTableById
 */
CashGameManager.prototype.getTableById = function(id) {
	for (var i = 0; i < this.tables.length; i++)
		if (this.tables[i].getId() == id)
			return this.tables[i];

	return null;
}

/**
 * Hard close.
 * @method close
 */
CashGameManager.prototype.close = function() {
	for (var i = 0; i < this.tables.length; i++)
		this.tables[i].close();
}

module.exports = CashGameManager;