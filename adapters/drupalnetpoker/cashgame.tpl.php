<html>
	<head>
		<link rel="shortcut icon" href="<?php echo $favicon; ?>" type="image/vnd.microsoft.icon" />
		<title><?php echo $title; ?></title>
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

				<?php if (isset($token)) { ?>
					netPokerClient.setToken("<?php echo $token; ?>");
				<?php } ?>

				<?php if (isset($tableId)) { ?>
					netPokerClient.setTableId(<?php echo $tableId; ?>);
				<?php } ?>

				<?php if ($skinSource) { ?>
					netPokerClient.addSkinSource(<?php echo json_encode($skinSource); ?>);
				<?php } ?>

				<?php foreach ($spriteSheets as $spriteSheet) { ?>
					netPokerClient.addSpriteSheet("<?php echo $spriteSheet; ?>");
				<?php } ?>

				netPokerClient.run();
			};
		</script>
	</head>
</html>