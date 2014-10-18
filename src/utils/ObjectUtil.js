/**
 * Object utilities.
 * @class ObjectUtil
 */
function ObjectUtil() {}

/**
 * Check object equality.
 * Not perfect but will do.
 * @method equals
 * @static
 */
ObjectUtil.equals = function(a, b) {
	if (typeof a != "object" || typeof b != "object")
		return a === b;

	var aProps = Object.getOwnPropertyNames(a);
	var bProps = Object.getOwnPropertyNames(b);

	if (aProps.length != bProps.length)
		return false;

	for (var i = 0; i < aProps.length; i++) {
		var propName = aProps[i];

		if (!ObjectUtil.equals(a[propName], b[propName]))
			return false;
	}

	return true;
}

module.exports = ObjectUtil;