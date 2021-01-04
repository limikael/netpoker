const NetPokerClient=require("./app/NetPokerClient");

if (window.jQuery) {
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
}

window.NetPokerClient=NetPokerClient;