<?php

/*
Plugin Name: Netpoker
Plugin URI: http://github.com/limikael/netpoker
Version: 0.0.2
*/

	require_once __DIR__."/src/model/Cashgame.php";
	require_once __DIR__."/src/plugin/NetPokerPlugin.php";
	require_once __DIR__."/src/utils/ActiveRecord.php";
	require_once __DIR__."/src/controller/ShortcodeController.php";
	require_once __DIR__."/src/controller/CashgameController.php";
	require_once __DIR__."/src/controller/SettingsController.php";
	require_once __DIR__."/src/utils/WpUtil.php";

	global $wpdb;

	ActiveRecord::setTablePrefix($wpdb->prefix);
	ActiveRecord::setPdo(WpUtil::getCompatiblePdo());

	NetPokerPlugin::init();
	ShortcodeController::init();

	if (is_admin()) {
		SettingsController::init();
		CashgameController::init();
	}
