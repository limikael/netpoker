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

/**
 * Generate from id and name, for test purposes.
 * @method fromIdAndName
 * @static
 */
User.fromIdAndName = function(id, name) {
	return new User({
		id: id,
		name: name
	});
}

module.exports = User;