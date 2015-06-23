<?php

	require_once __DIR__."/src/utils/WpUtil.php";
	require_once __DIR__."/src/utils/ActiveRecord.php";
	require_once __DIR__."/src/utils/Template.php";
	require_once __DIR__."/src/plugin/NetPokerPlugin.php";

	require_once WpUtil::getWpLoadPath();

	global $wpdb;

	ActiveRecord::setTablePrefix($wpdb->prefix);
	ActiveRecord::setPdo(WpUtil::getCompatiblePdo());

	$url="ws://".
		NetPokerPlugin::init()->getGameplayServerHost().":".
		get_option("netpoker_gameplay_server_port");

	session_start();

	$user=wp_get_current_user();
	if ($user) {
		$_SESSION["netpoker_user_id"]=$user->ID;
	}

	$template=new Template(__DIR__."/src/template/game.tpl.php");
	$template->set("bundleLoaderUrl","res/bundleloader.min.js");
	$template->set("bundleUrl","bin/netpokerclient.bundle.min.js");
	$template->set("title","Poker");
	$template->set("url",$url);
	$template->set("mainSpriteSheet","bin/netpokerclient.spritesheet.json");
	$template->set("spriteSheets",array());
	$template->set("token",session_id());

	if (isset($_REQUEST["cashgameId"]))
		$template->set("tableId",$_REQUEST["cashgameId"]);

	$template->show();