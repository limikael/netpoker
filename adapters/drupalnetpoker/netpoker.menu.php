<?php

	/**
	 * @file
	 * Handle extra page calls for the netpoker module.
	 *
	 * These are registered in the netpoker_menu function in the 
	 * netpoker.module file.
	 */

	/**
	 * Ensure that the right api key is passed. This function
	 * is called from all pages that require an api key.
	 */
	function netpoker_checkKey() {
		$key=variable_get("netpoker_gameplay_key");

		if (!$_REQUEST["key"] || $key!=$_REQUEST["key"]) {
			drupal_json_output(array(
				"ok"=>0,
				"message"=>"wrong api key"
			));

			exit();
		}
	}

	/**
	 * Api call: getCashGameTableList
	 */
	function netpoker_getCashGameTableList() {
		netpoker_checkKey();

		$ids=db_select("node","n")
			->fields("n",array("nid"))
			->condition("n.type","pokergame","=")
			->execute()
			->fetchAll(PDO::FETCH_COLUMN,0);

		$pokergames=entity_load("node",$ids);

		//echo "<pre>"; print_r($pokergames);

		$tables=array();

		foreach ($pokergames as $pokergame) {
			$tables[]=array(
				"id"=>$pokergame->nid,
				"numseats"=>intval($pokergame->field_netpoker_players[LANGUAGE_NONE][0]["value"]),
				"currency"=>"PLY",
				"name"=>$pokergame->title,
				"minSitInAmount"=>10,
				"maxSitInAmount"=>100,
				"stake"=>2,
			);
		}

		drupal_json_output(array(
			"ok"=>1,
			"tables"=>$tables
		));
	}

	function netpoker_getUserInfoByToken() {
		netpoker_checkKey();

		$token=$_REQUEST["token"];

		$query=db_select("sessions","s");
		$query->innerJoin("users","u","s.uid=u.uid");
		$query->fields("u");
		$query->condition("s.sid",$token,"=");

		$user=$query->execute()->fetchAssoc();

		if (!$user) {
			drupal_json_output(array(
				"ok"=>1,
				"id"=>null
			));
			return;
		}

		drupal_json_output(array(
			"ok"=>1,
			"id"=>$user["uid"],
			"name"=>$user["name"]
		));
	}

	function netpoker_getUserBalance() {
		netpoker_checkKey();

		$userId=$_REQUEST["userId"];
		$currency=$_REQUEST["currency"];

		$users=entity_load("user",array($userId));
		$user=$users[$userId];

		$balance=0;

		if (isset($user->field_netpoker_playmoney[LANGUAGE_NONE][0]["value"]))
			$balance=$user->field_netpoker_playmoney[LANGUAGE_NONE][0]["value"];

		drupal_json_output(array(
			"ok"=>1,
			"balance"=>intval($balance)
		));
	}

	function netpoker_serverConfig() {
		global $base_url;

		echo "clientPort: ".variable_get("netpoker_gameplay_server_port")."\n";
		echo "backend: ".$base_url."/netpoker/\n";
		echo "apiOnClientPort: true\n";
	}

	function netpoker_cashGame($nid) {
		global $base_url;

		$host=variable_get("netpoker_gameplay_server_host");
		if (!$host)
			$host=$_SERVER["HTTP_HOST"];

		$vars=array(
			"url"=>"ws://".$host.":".variable_get("netpoker_gameplay_server_port")."/",
			"baseUrl"=>$base_url."/netpoker/bin/",
			"bundleUrl"=>"netpokerclient.bundle.js",
			"skinUrl"=>"texture.json",
			"token"=>session_id(),
			"nid"=>$nid
		);

		$templatePath=drupal_get_path("module","netpoker")."/cashgame.tpl.php";
		echo theme_render_template($templatePath,$vars);
	}

	function netpoker_bin($file) {
		readfile(__DIR__."/bin/".$file);
	}

	function netpoker_cashGameUserJoin() {
		netpoker_checkKey();

		$userId=$_REQUEST["userId"];
		$tableId=$_REQUEST["tableId"];
		$amount=$_REQUEST["amount"];

		$users=entity_load("user",array($userId));
		$user=$users[$userId];

		if ($amount>$user->field_netpoker_playmoney[LANGUAGE_NONE][0]["value"]) {
			drupal_json_output(array(
				"ok"=>0,
				"message"=>"Not enough balance."
			));

			return;
		}

		$user->field_netpoker_playmoney[LANGUAGE_NONE][0]["value"]-=$amount;
		field_attach_update("user",$user);

		watchdog("netpoker_join",
			"userId=$userId&tableId=$tableId&amount=$amount", 
			array(), WATCHDOG_INFO);

		drupal_json_output(array(
			"ok"=>1
		));
	}

	function netpoker_cashGameUserLeave() {
		netpoker_checkKey();

		$userId=$_REQUEST["userId"];
		$tableId=$_REQUEST["tableId"];
		$amount=$_REQUEST["amount"];

		$users=entity_load("user",array($userId));
		$user=$users[$userId];

		$user->field_netpoker_playmoney[LANGUAGE_NONE][0]["value"]+=$amount;
		field_attach_update("user",$user);

		watchdog("netpoker_leave",
			"userId=$userId&tableId=$tableId&amount=$amount", 
			array(), WATCHDOG_INFO);

		drupal_json_output(array(
			"ok"=>1
		));
	}

	function netpoker_gameStartForCashGame() {
		netpoker_checkKey();

		$tableId=$_REQUEST["parentId"];

		$tables=entity_load("node",array($tableId));
		$table=$tables[$tableId];

		if (!$table) {
			drupal_json_output(array(
				"ok"=>0
			));
			return;
		}

		$id=variable_get("netpoker_cashgame_id");
		variable_set("netpoker_cashgame_id",$id+1);

		watchdog(
			"netpoker_start_cashgame",
			"gameId=$id&tableId=$tableId", 
			array(), WATCHDOG_INFO
		);

		drupal_json_output(array(
			"ok"=>1,
			"gameId"=>$id
		));
	}

	function netpoker_gameFinish() {
		netpoker_checkKey();

		$gameId=$_REQUEST["gameId"];
		$state=$_REQUEST["state"];
		$rake=$_REQUEST["rake"];

		watchdog(
			"netpoker_finish_cashgame",
			"gameId=$gameId&rake=$rake&state=$state"
		);

		drupal_json_output(array(
			"ok"=>1
		));
	}
