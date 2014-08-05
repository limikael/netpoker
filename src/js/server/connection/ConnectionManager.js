var MessageServer = require("../../utils/MessageServer");

/**
 * Connection manager.
 * @class ConnectionManager
 */
function ConnectionManager() {
	this.messageServer = null;
}

/**
 * Message server connection.
 * @method onMessageServerConnection
 * @private
 */
ConnectionManager.prototype.onMessageServerConnection=function(e) {
	var userConnection=new UserConnection(e.connection);
}

/**
 * Start listening for connections.
 * @function listen
 */
ConnectionManager.prototype.listen = function(port) {
	this.messageServer = new MessageServer();
	this.messageServer.on(MessageServer.CONNECTION, this.onMessageServerConnection, this);
	this.messageServer.listen(port);
}