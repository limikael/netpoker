<?php

namespace netpoker;

require_once __DIR__."/../utils/Singleton.php";
require_once __DIR__."/../controller/CashGameController.php";

class NetPokerPlugin extends Singleton {
	protected function __construct() {
		CashGameController::instance();

		/*if (is_admin())
			ThingSettings::instance();*/
	}

	public function activate() {
	}

	public function uninstall() {
	}

	/*public function cmb2_meta_box_url($url) {
		if (strpos($url,"wp-thing"))
			$url=THING_URL."/ext/CMB2/";

		return $url;
	}*/
}