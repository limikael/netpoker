(function($) {
	$('.netpokerclient').netpoker(netpokerConfig);

	$("#netpoker-viewcase-select").change(()=>{
		$("#netpoker-viewcase-form").submit();
	});
})(jQuery);
