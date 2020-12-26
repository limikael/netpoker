const NetPokerClient=require("./app/NetPokerClient");
const ArrayUtil=require("../utils/ArrayUtil");

(function($) {
	$.fn.netpoker=function(params) {
		$(this).each(function() {
			let paramsCopy={...params};
			paramsCopy.element=$(this)[0];
			let netPokerClient=new NetPokerClient(paramsCopy);
			netPokerClient.run();
		});
	}
})(jQuery);
