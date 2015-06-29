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

			$balance=NetPokerPlugin::init()->getEntityBalance($p["currency"],$user);

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

			NetPokerPlugin::init()->makeEntityTransaction(
				$cashgame->currency,
				$user,$cashgame,
				$p["amount"],"Sit in"
			);
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

			NetPokerPlugin::init()->makeEntityTransaction(
				$cashgame->currency,
				$cashgame,$user,
				$p["amount"],"Sit out"
			);
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
		 * Get tournament info.
		 */
		public function tournamentInfo($p) {
			$tournament=Tournament::findOne($p["tournamentId"]);
			if (!$tournament)
				throw new Exception("Can't find tournament.");

			return $tournament->getInfoData();
		}

		/**
		 * Register for tournament.
		 */
		public function tournamentRegister($p) {
			$tournament=Tournament::findOne($p["tournamentId"]);
			if (!$tournament)
				throw new Exception("Can't find tournament.");

			$user=get_user_by("id",$p["userId"]);
			if (!$user)
				throw new Exception("Unknown user.");

			$tournament->registerUser($user);
		}

		/**
		 * Register for tournament.
		 */
		public function tournamentUnregister($p) {
			$tournament=Tournament::findOne($p["tournamentId"]);
			if (!$tournament)
				throw new Exception("Can't find tournament.");

			$user=get_user_by("id",$p["userId"]);
			if (!$user)
				throw new Exception("Unknown user.");

			$tournament->unregisterUser($user);
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