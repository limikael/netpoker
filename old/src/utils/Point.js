/**
 * Utilities.
 * @module utils
 */

/**
 * Represents a point.
 * @class Point
 * @module utils
 */
function Point(x, y) {
	if (!(this instanceof Point))
		return new Point(x, y);

	this.x = x;
	this.y = y;
}

module.exports = Point;