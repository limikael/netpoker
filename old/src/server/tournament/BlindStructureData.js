/**
 * Server.
 * @module server
 */

/**
 * Has information about the blind structure.
 * @method BlindStructureData
 */
function BlindStructureData(time, stake, ante) {
	this.time = time;
	this.stake = stake;
	this.ante = ante;
}

/**
 * Get time.
 * @method getTime
 */
BlindStructureData.prototype.getTime = function() {
	return this.time;
}

/**
 * Get time.
 * @method getStake
 */
BlindStructureData.prototype.getStake = function() {
	return this.stake;
}

/**
 * Get time.
 * @method getAnte
 */
BlindStructureData.prototype.getAnte = function() {
	return this.ante;
}

module.exports = BlindStructureData;