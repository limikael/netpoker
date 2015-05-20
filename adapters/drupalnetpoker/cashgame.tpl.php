<html>
	<head>
		<title>Testing</title>
		<script src="<?php echo $bundleUrl; ?>"></script>
		<script>
			function run() {
				var netPokerClient = new NetPokerClient();
				netPokerClient.setUrl("<?php echo $url; ?>");
				netPokerClient.setSkin("<?php echo $skinUrl; ?>");
				netPokerClient.setToken("<?php echo $token; ?>");
				netPokerClient.setTableId(<?php echo $nid; ?>);
				netPokerClient.run();
			}
		</script>
	</head>
	<body onload="run();">
	</body>
</html>