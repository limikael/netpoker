<?php

	namespace wpnetpoker;

	require_once __DIR__."/../utils/Singleton.php";
	require_once __DIR__."/../plugin/NetPokerPlugin.php";
	require_once __DIR__."/../model/Cashgame.php";

	use \Exception;

	/**
	 * Api controller.
	 */
	class ApiController extends Singleton {

		/**
		 * Get cash game table list.
		 */
		public function getCashGameTableList() {
			$tables=array();

			foreach (Cashgame::findAll() as $cashgame) {
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
			}

			return array(
				"tables"=>$tables
			);
		}

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
			$user=get_user_by("id",$p["userId"]);
			if (!$user)
				throw new Exception("Unknown user.");

			switch ($p["currency"]) {
				case "ply":
					$balance=NetPokerPlugin::init()->getUserPlyBalance($user->ID);
					break;

				case "bits":
					$balance=bca_user_account($user)->getBalance("bits");
					break;

				default:
					throw new Exception("Unknown currency: ".$p["currency"]);
					break;
			}

			return array(
				"balance"=>$balance
			);
		}

		/**
		 * Join cashgame.
		 */
		public function cashGameUserJoin($p) {
			$user=get_user_by("id",$p["userId"]);
			if (!$user)
				throw new Exception("Unknown user.");

			$cashgame=Cashgame::findOne($p["tableId"]);			
			if (!$cashgame)
				throw new Exception("Can't find game.");

			switch ($cashgame->currency) {
				case "ply":
					NetPokerPlugin::init()->changeUserPlyBalance($p["userId"],-$p["amount"]);
					break;

				case "bits":
					bca_make_transaction("bits",
						bca_user_account($user),
						bca_entity_account("cashgame",$cashgame->id),
						$p["amount"],"Sit in"
					);
					break;

				default:
					throw new Exception("Unknown currency: ".$cashgame->currency);
					break;
			}
		}

		/**
		 * Leave cashgame.
		 */
		public function cashGameUserLeave($p) {
			$user=get_user_by("id",$p["userId"]);
			if (!$user)
				throw new Exception("Unknown user.");

			$cashgame=Cashgame::findOne($p["tableId"]);			
			if (!$cashgame)
				throw new Exception("Can't find game.");

			switch ($cashgame->currency) {
				case "ply":
					NetPokerPlugin::init()->changeUserPlyBalance($p["userId"],$p["amount"]);
					break;

				case "bits":
					bca_make_transaction("bits",
						bca_entity_account("cashgame",$cashgame->id),
						bca_user_account($user),
						$p["amount"],"Sit out"
					);
					break;

				default:
					throw new Exception("Unknown currency: ".$cashgame->currency);
					break;
			}

		}

		/**
		 * Start for cash game.
		 */
		public function gameStartForCashGame($p) {
			$cashgame=Cashgame::findOne($p["parentId"]);
			if (!$cashgame)
				throw new Exception("Can't find game.");

			$gameId=NetPokerPlugin::init()->useGameId();

			return array(
				"gameId"=>$gameId
			);
		}

		/**
		 * Start for cash game.
		 */
		public function gameFinish($p) {
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

				if ($_REQUEST["key"]!=get_option("netpoker_gameplay_key"))
					throw new Exception("Wrong key");

				$res=$this->$method($_REQUEST);
			}

			catch (Exception $e) {
				echo json_encode(array(
					"ok"=>0,
					"message"=>$e->getMessage()
				));

				exit;
			}

			$res["ok"]=1;
			echo json_encode($res);
		}
	}