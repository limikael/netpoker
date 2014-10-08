/**
 * Table util.
 * @class TableUtil
 */
function TableUtil() {}

/**
 * Which seats should be active given number of seats.
 * @method getActiveSeatIndices
 * @static
 */
TableUtil.getActiveSeatIndices = function(numSeats) {
	var activeIndices;

	//console.log("getting active seats: " + numSeats);

	switch (numSeats) {
		case 2:
			activeIndices = [4, 8];
			break;

		case 3:
			activeIndices = [4, 6, 8];
			break;

		case 4:
			activeIndices = [3, 5, 7, 9];
			break;

		case 6:
			activeIndices = [1, 3, 5, 6, 7, 9];
			break;

		case 8:
			activeIndices = [0, 1, 2, 3, 5, 6, 7, 9];
			break;

		case 10:
			activeIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
			break;

		default:
			throw "Bad number of seats...";
			break;
	}

	return activeIndices;
}

module.exports = TableUtil;