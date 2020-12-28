<?php

namespace netpoker;

require_once __DIR__."/../utils/Singleton.php";
require_once __DIR__."/../controller/CashGameController.php";
require_once __DIR__."/../controller/TableController.php";
require_once __DIR__."/../controller/SettingsController.php";

class NetPokerPlugin extends Singleton {
	protected function __construct() {
		CashGameController::instance();
		TableController::instance();

		if (is_admin()) {
			SettingsController::instance();
		}
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

	public function serverRequest($method, $params=array()) {
		$curl=curl_init();
		$url=get_option("netpoker_serverurl")."/".$method;
		//$params["key"]=get_option("netpoker_key");
		$url.="?".http_build_query($params);

		curl_setopt($curl,CURLOPT_URL,$url);
		curl_setopt($curl,CURLOPT_RETURNTRANSFER,TRUE);
		//curl_setopt($curl,CURLOPT_SSL_VERIFYPEER,FALSE);
		$res=curl_exec($curl);

		if ($res===FALSE) {
			error_log("backend call failed: ".$method);

			throw new \Exception("Backend call failed: ".curl_error($curl));
			return NULL;
		}

		return json_decode($res,TRUE);
	}
}