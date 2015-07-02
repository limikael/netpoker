<?php

	require_once __DIR__."/src/utils/WpUtil.php";
	require_once __DIR__."/src/utils/Template.php";
	require_once __DIR__."/src/plugin/NetPokerPlugin.php";

	use wpnetpoker\WpUtil;
	use wpnetpoker\NetPokerPlugin;
	use wpnetpoker\Template;

	require_once WpUtil::getWpLoadPath();

	$url="ws://".
		NetPokerPlugin::init()->getGameplayServerHost().":".
		get_option("netpoker_gameplay_server_port");

	if (!session_id())
		session_start();

	$user=wp_get_current_user();
	if ($user) {
		$_SESSION["netpoker_user_id"]=$user->ID;
	}

	$skinVariables=array();

	function netpoker_set_skin_variables($vars) {
		global $skinVariables;

		$skinVariables=$vars;
	}

	do_action("netpoker_game_theme");

	if (!isset($skinVariables["spritesheets"]))
		$skinVariables["spritesheets"]=array();

	if (isset($skinVariables["spritesheet"]))
		$skinVariables["spritesheets"][]=$skinVariables["spritesheet"];

	$template=new Template(__DIR__."/src/template/game.tpl.php");
	$template->set("bundleLoaderUrl","res/bundleloader.min.js");
	$template->set("bundleUrl","bin/netpokerclient.bundle.min.js");
	$template->set("title","Poker");
	$template->set("url",$url);
	$template->set("mainSpriteSheet","bin/netpokerclient.spritesheet.json");
	$template->set("spriteSheets",$skinVariables["spritesheets"]);
	$template->set("skinSource",$skinVariables);
	$template->set("token",session_id());

	if (isset($_REQUEST["cashgameId"]))
		$template->set("tableId",$_REQUEST["cashgameId"]);

	if (isset($_REQUEST["tournamentId"]))
		$template->set("tournamentId",$_REQUEST["tournamentId"]);

	$template->show();