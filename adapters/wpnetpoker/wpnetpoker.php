<?php

/*
Plugin Name: Netpoker
Plugin URI: http://github.com/limikael/netpoker
Version: 0.0.2
*/

	require_once __DIR__."/src/plugin/NetPokerPlugin.php";
	require_once __DIR__."/src/controller/ShortcodeController.php";
	require_once __DIR__."/src/controller/CashgameController.php";
	require_once __DIR__."/src/controller/TournamentController.php";
	require_once __DIR__."/src/controller/SettingsController.php";

	use wpnetpoker\NetPokerPlugin;
	use wpnetpoker\ShortcodeController;
	use wpnetpoker\SettingsController;
	use wpnetpoker\CashgameController;
	use wpnetpoker\TournamentController;

	NetPokerPlugin::init();
	ShortcodeController::init();

	if (is_admin()) {
		SettingsController::init();
		CashgameController::init();
		TournamentController::init();
	}
