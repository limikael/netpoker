<?php

namespace netpoker;

require_once __DIR__."/../utils/Singleton.php";
require_once __DIR__."/../model/CashGame.php";

class BackendController extends Singleton {
	protected function __construct() {
		add_action("wp_ajax_netpoker",array($this,"dispatch"));
		add_action("wp_ajax_nopriv_netpoker",array($this,"dispatch"));
	}

	/**
	 * Get cash game table list.
	 */
	public function getCashGameTableList() {
		$tables=array();

		foreach (CashGame::getAllActive() as $cashGame) {
			$tables[]=array(
				"id"=>$cashGame->getId(),
				"name"=>$cashGame->getName(),
				"currency"=>$cashGame->getMeta("currency"),
				"stake"=>$cashGame->getMeta("stake"),
				"minSitInAmount"=>$cashGame->getMeta("minSitInAmount"),
				"maxSitInAmount"=>$cashGame->getMeta("maxSitInAmount"),
				"rakePercent"=>$cashGame->getMeta("rakePercent")
			);
		}

		/*foreach (Cashgame::findAll() as $cashgame) {
			$tables[]=array(
				"id"=>$cashgame->id,
				"numseats"=>$cashgame->numseats,
				"currency"=>$cashgame->currency,
				"name"=>$cashgame->title,
				"minSitInAmount"=>$cashgame->minSitInAmount,
				"maxSitInAmount"=>$cashgame->maxSitInAmount,
				"stake"=>$cashgame->stake,
				"rakePercent"=>$cashgame->rakePercent
			);
		}*/

		return array(
			"tables"=>$tables
		);
	}

	public function dispatch() {
		$method=basename($_REQUEST["method"]);

		if ($method=="dispatch" || !ctype_alpha($method))
			$method=NULL;

		try {
			if (!method_exists($this, $method))
				throw new \Exception("Unknown method: ".$method);

			if ($_REQUEST["key"]!=get_option("netpoker_gameplay_key"))
				throw new \Exception("Wrong key");

			$res=$this->$method($_REQUEST);
		}

		catch (\Exception $e) {
			echo json_encode(array(
				"ok"=>0,
				"message"=>$e->getMessage()
			),JSON_PRETTY_PRINT)."\n";

			wp_die('','',array("response"=>500));
			exit;
		}

		$res["ok"]=1;
		echo json_encode($res,JSON_PRETTY_PRINT)."\n";
		wp_die();
	}
}