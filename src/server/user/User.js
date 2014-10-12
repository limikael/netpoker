/**
 * Server.
 * @module server
 */

/**
 * Represents a user.
 * @class User
 */
function User(data) {
	if (!data || !data.name || !data.id)
		throw new Error("Bad user data.");

	this.name = data.name;
	this.id = data.id;
}

/**
 * Get name.
 * @method getName
 */
User.prototype.getName = function() {
	return this.name;
}

/**
 * Get id.
 * @method getId
 */
User.prototype.getId = function() {
	return this.id;
}

module.exports = User;