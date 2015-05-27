<html>
	<head>
		<title>Testing</title>
		<script src="<?php echo $bundleLoaderUrl; ?>"></script>
		<script>
			var loader = new BundleLoader();

			loader.load("<?php echo $bundleUrl; ?>", "LOADING", 50);

			loader.onload = function() {
				var netPokerClient = new NetPokerClient();

				netPokerClient.on("appStateChange", function(ev) {
					if (ev.message && ev.progress)
						loader.showProgress(ev.message, ev.progress);

					else if (ev.message)
						loader.showMessage(ev.message);

					else
						loader.hide();
				});

				netPokerClient.setUrl("<?php echo $url; ?>");
				netPokerClient.setSpriteSheet("<?php echo $skinUrl; ?>");
				netPokerClient.setToken("<?php echo $token; ?>");
				netPokerClient.setTableId(<?php echo $nid; ?>);

				<?php if ($skinSource) { ?>
					netPokerClient.addSkinSource(<?php echo json_encode($skinSource); ?>);
				<?php } ?>

				<?php foreach ($spriteSheets as $spriteSheet) { ?>
					netPokerClient.addSpriteSheet("<?php echo $spriteSheet; ?>");
				<?php } ?>

				netPokerClient.run();
			};
		</script>
	</head>
</html>