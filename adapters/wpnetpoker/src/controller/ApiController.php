<?php

	require_once __DIR__."/../utils/Singleton.php";

	/**
	 * Api controller.
	 */
	class ApiController extends Singleton {

		/**
		 * Get server config.
		 */
		public function serverConfig() {
			return array(
				"clientPort"=>get_option("netpoker_gameplay_server_port"),
				"backend"=>plugins_url()."/wpnetpoker/api.php",
				"apiOnClientPort"=>TRUE,
				"key"=>get_option("netpoker_gameplay_key")
			);
		}

		/**
		 * Dispatch call.
		 */
		public function dispatch() {
			$method=basename($_SERVER["PHP_SELF"]);
			$res=$this->$method($_REQUEST);
			$res["ok"]=1;
			echo json_encode($res);
		}
	}