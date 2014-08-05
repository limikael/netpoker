/**
 * Function utils.
 */
function FunctionUtil() {
}

/**
 * Extend a class.
 * Don't forget to call super.
 */
FunctionUtil.extend=function(target, base) {
	target.prototype=Object.create(base.prototype);
	target.prototype.constructor=target;
}

/**
 * Create delegate function.
 */
FunctionUtil.createDelegate=function(func, scope) {
	return function() {
		func.apply(scope,arguments);
	};
}

module.exports=FunctionUtil;
