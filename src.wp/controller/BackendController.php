<?php

namespace netpoker;

require_once __DIR__."/../utils/Singleton.php";
require_once __DIR__."/../model/CashGame.php";
require_once __DIR__."/../model/Account.php";

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

		foreach (CashGame::findAllActive() as $cashGame) {
			$tables[]=array(
				"id"=>$cashGame->getId(),
				"name"=>$cashGame->getName(),
				"numSeats"=>$cashGame->getMeta("numSeats"),
				"currency"=>$cashGame->getMeta("currency"),
				"stake"=>$cashGame->getMeta("stake"),
				"minSitInAmount"=>$cashGame->getMeta("minSitInAmount"),
				"maxSitInAmount"=>$cashGame->getMeta("maxSitInAmount"),
				"rakePercent"=>$cashGame->getMeta("rakePercent")
			);
		}

		return array(
			"tables"=>$tables
		);
	}

	/**
	 * Num players change.
	 */
	public function notifyCashGameNumPlayers($p) {
		$cashGame=Cashgame::findOneById($p["tableId"]);
		if (!$cashGame)
			throw new Exception("Can't find game.");

		$cashGame->setMeta("numPlayers",$p["numPlayers"]);
	}

	/**
	 * Get user info by token
	 */
	public function getUserInfoByToken($p) {
		if (session_id())
			session_commit();

		session_id($p["token"]);
		session_start();

		$user=get_user_by("id",$_SESSION["netpoker_user_id"]);

		if (!$user)
			return;

		return array(
			"id"=>$user->ID,
			"name"=>$user->display_name
		);
	}

	/**
	 * Get user balance.
	 */
	public function getUserBalance($p) {
		$account=Account::getUserPlyAccount($p["userId"]);

		return array(
			"balance"=>$account->getBalance()
		);
	}

	/**
	 * Join cashgame.
	 */
	public function joinCashGame($p) {
		$cashGame=Cashgame::findOneById($p["tableId"]);			
		if (!$cashGame)
			throw new Exception("Can't find game.");

		$cashGameAccount=$cashGame->getAccount();

		$user=get_user_by("id",$p["userId"]);
		if (!$user)
			throw new Exception("Unknown user.");

		$userAccount=new Account($cashGameAccount->getCurrency(),"user",$user->ID);

		Account::transact($userAccount,$cashGameAccount,$p["amount"],"Sit in");
	}

	/**
	 * Leave cashgame.
	 */
	public function leaveCashGame($p) {
		$cashGame=Cashgame::findOneById($p["tableId"]);			
		if (!$cashGame)
			throw new Exception("Can't find game.");

		$cashGameAccount=$cashGame->getAccount();

		$user=get_user_by("id",$p["userId"]);
		if (!$user)
			throw new Exception("Unknown user.");

		$userAccount=new Account($cashGameAccount->getCurrency(),"user",$user->ID);

		Account::transact($cashGameAccount,$userAccount,$p["amount"],"Leave");
	}

	/**
	 * Start cash game.
	 */
	public function startCashGame($p) {
		$game=new Game();
		$game->post_id=$p["parentId"];
		$game->stamp=current_time("mysql",TRUE);
		$game->save();

		return array(
			"gameId"=>$game->id
		);
	}

	/**
	 * Finish game.
	 */
	public function finishGame($p) {
		$game=Game::findOne($p["gameId"]);
		$game->state=$p["state"];
		$game->save();
	}

	/**
	 * Handle call.
	 */
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