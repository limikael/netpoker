/**
 * Array utilities.
 * @class ArrayUtil
 */
function ArrayUtil() {}

/**
 * Remove an element.
 * @method remove
 */
ArrayUtil.remove = function(array, element) {
	var index = array.indexOf(element);

	if (index >= 0)
		array.splice(index, 1);
}

module.exports = ArrayUtil;