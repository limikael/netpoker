<?php

	namespace wpnetpoker;

	require_once __DIR__."/../utils/Singleton.php";
	require_once __DIR__."/../plugin/NetPokerPlugin.php";
	require_once __DIR__."/../model/Cashgame.php";

	use \Exception;

	/**
	 * Ajax calls made from the site.
	 */
	class AjaxController extends Singleton {

		/**
		 * Poll number of players.
		 */
		public function pollNumPlayers($p) {
			if (session_id())
				session_commit();

			$params=array();

			if (isset($p["state"]))
				$params["state"]=$p["state"];

			return NetPokerPlugin::init()->serverRequest("pollNumPlayers",$params);
		}

		/**
		 * Dispatch call.
		 */
		public function dispatch() {
			$method=basename($_SERVER["PHP_SELF"]);

			if ($method=="dispatch" || !ctype_alpha($method))
				$method=NULL;

			try {
				if (!method_exists($this, $method))
					throw new Exception("Unknown method: ".$method);

				foreach ($_REQUEST as $k=>$v)
					$_REQUEST[$k]=stripslashes($_REQUEST[$k]);

				$res=$this->$method($_REQUEST);
			}

			catch (Exception $e) {
				echo json_encode(array(
					"ok"=>0,
					"message"=>$e->getMessage()
				));

				exit;
			}

			//$res["ok"]=1;
			echo json_encode($res);
		}
	}