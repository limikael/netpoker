<?php

	require_once __DIR__."/netpoker.functions.php";

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
	 * Fail hard.
	 */
	function netpoker_fail($message="Unknown error.") {
		drupal_json_output(array(
			"ok"=>0,
			"message"=>$message
		));

		exit();
	}

	/**
	 * Api call: getCashGameTableList
	 */
	function netpoker_getCashGameTableList() {
		netpoker_checkKey();

		$ids=db_select("node","n")
			->fields("n",array("nid"))
			->condition("n.type","pokergame")
			->condition("n.status",1)
			->execute()
			->fetchAll(PDO::FETCH_COLUMN,0);

		$pokergames=entity_load("node",$ids);

		$tables=array();

		foreach ($pokergames as $pokergame) {
			$tables[]=array(
				"id"=>$pokergame->nid,
				"numseats"=>intval($pokergame->field_netpoker_players[LANGUAGE_NONE][0]["value"]),
				"currency"=>$pokergame->field_netpoker_currency[LANGUAGE_NONE][0]["value"],
				"name"=>$pokergame->title,
				"minSitInAmount"=>intval($pokergame->field_netpoker_min_sit_in[LANGUAGE_NONE][0]["value"]),
				"maxSitInAmount"=>intval($pokergame->field_netpoker_max_sit_in[LANGUAGE_NONE][0]["value"]),
				"stake"=>intval($pokergame->field_netpoker_stake[LANGUAGE_NONE][0]["value"]),
				"rakePercent"=>$pokergame->field_netpoker_rake_percent[LANGUAGE_NONE][0]["value"],
			);
		}

		drupal_json_output(array(
			"ok"=>1,
			"tables"=>$tables
		));
	}

	/**
	 * Api call: getUserInfoByToken
	 */
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

	/**
	 * Api call: getUserBalance
	 */
	function netpoker_getUserBalance() {
		netpoker_checkKey();

		$userId=$_REQUEST["userId"];
		$currency=$_REQUEST["currency"];
		$balance=netpoker_get_balance($currency,array("uid"=>$userId));

		drupal_json_output(array(
			"ok"=>1,
			"balance"=>$balance
		));
	}

	/**
	 * Api call: serverConfig
	 */
	function netpoker_serverConfig() {
		echo "clientPort: ".variable_get("netpoker_gameplay_server_port")."\n";
		echo "backend: ".url("netpoker/",array("absolute"=>TRUE))."\n";
		echo "apiOnClientPort: true\n";
	}

	/**
	 * Api call: cashGame
	 * Serve up the cashgame html page.
	 */
	function netpoker_cashGame($nid) {
		$host=netpoker_get_gameplay_server_host();
		$table=node_load($nid);

		$vars=array(
			"title"=>variable_get('site_name')." | ".$table->title,
			"tableId"=>$nid,
			"url"=>"ws://".$host.":".variable_get("netpoker_gameplay_server_port")."/",
			"token"=>session_id(),
		);

		netpoker_showTable($vars);
	}

	/**
	 * Test skin.
	 */
	function netpoker_skinTest() {
		$modulePath=base_path().drupal_get_path("module","netpoker");

		$url=$modulePath."/viewcases/".$_REQUEST["case"];

		$vars=array(
			"url"=>$url
		);

		netpoker_showTable($vars);
	}

	/**
	 * Show the table.
	 */
	function netpoker_showTable($vars) {
		$skinVariables=array(
			"spritesheets"=>array(),
		);

		drupal_alter("netpoker_skin",$skinVariables);

		$modulePath=base_path().drupal_get_path("module","netpoker");

		if (!isset($vars["title"]))
			$vars["title"]="Testing";

		$vars["favicon"]=theme_get_setting("favicon");
		$vars["bundleUrl"]=$modulePath."/bin/netpokerclient.bundle.min.js?nocache=".rand();
		$vars["skinUrl"]=$modulePath."/bin/netpokerclient.spritesheet.json?nocache=".rand();
		$vars["bundleLoaderUrl"]=$modulePath."/bundleloader.min.js";
		$vars["skinSource"]=$skinVariables;
		$vars["spriteSheets"]=$skinVariables["spritesheets"];

		$templatePath=drupal_get_path("module","netpoker")."/cashgame.tpl.php";
		echo theme_render_template($templatePath,$vars);
	}

	/**
	 * Api call: bin
	 * Serve binary files used by the client.
	 */
	function netpoker_bin($file) {
		switch (pathinfo($file,PATHINFO_EXTENSION)) {
			case "png":
				header("Content-type: image/png");
				break;

			case "js":
				header("Content-type: text/javascript");
				break;

			case "json":
				header("Content-type: application/json");
				break;
		}

		readfile(__DIR__."/bin/".$file);
	}

	/**
	 * Api call: cashGameUserJoin
	 */
	function netpoker_cashGameUserJoin() {
		netpoker_checkKey();

		$userId=$_REQUEST["userId"];
		$tableId=$_REQUEST["tableId"];
		$amount=$_REQUEST["amount"];

		$tables=entity_load("node",array($tableId));
		$table=$tables[$tableId];

		if (!$table)
			netpoker_fail("Table not found for join.");

		try {
			netpoker_transaction(
				$table->field_netpoker_currency[LANGUAGE_NONE][0]["value"],
				array("uid"=>$userId),
				array("nid"=>$table->nid),
				$amount,
				"Join cashgame"
			);
		}

		catch (Exception $e) {
			netpoker_fail($e->getMessage());
		}

		if (!$table->field_netpoker_current_players[LANGUAGE_NONE][0]["value"])
			$table->field_netpoker_current_players[LANGUAGE_NONE][0]["value"]=0;

		$table->field_netpoker_current_players[LANGUAGE_NONE][0]["value"]+=1;
		field_attach_update("node",$table);

		watchdog("netpoker_join",
			"userId=$userId&tableId=$tableId&amount=$amount", 
			array(), WATCHDOG_INFO);

		drupal_json_output(array(
			"ok"=>1
		));
	}

	/**
	 * Api call: cashGameUserLeave
	 */
	function netpoker_cashGameUserLeave() {
		netpoker_checkKey();

		$userId=$_REQUEST["userId"];
		$tableId=$_REQUEST["tableId"];
		$amount=$_REQUEST["amount"];

		$tables=entity_load("node",array($tableId));
		$table=$tables[$tableId];

		if (!$table)
			netpoker_fail("Table not found for leave.");

		try {
			netpoker_transaction(
				$table->field_netpoker_currency[LANGUAGE_NONE][0]["value"],
				array("nid"=>$table->nid),
				array("uid"=>$userId),
				$amount,
				"Leave cashgame"
			);
		}

		catch (Exception $e) {
			netpoker_fail($e->getMessage());
		}

		if (!$table->field_netpoker_current_players[LANGUAGE_NONE][0]["value"])
			$table->field_netpoker_current_players[LANGUAGE_NONE][0]["value"]=0;

		$table->field_netpoker_current_players[LANGUAGE_NONE][0]["value"]-=1;
		field_attach_update("node",$table);

		watchdog("netpoker_leave",
			"userId=$userId&tableId=$tableId&amount=$amount", 
			array(), WATCHDOG_INFO);

		drupal_json_output(array(
			"ok"=>1
		));
	}

	/**
	 * Api call: gameStartForCashGame
	 */
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

	/**
	 * Api call: gameFinish
	 */
	function netpoker_gameFinish() {
		netpoker_checkKey();

		$gameId=$_REQUEST["gameId"];
		$state=$_REQUEST["state"];
		$rake=$_REQUEST["rake"];
		$tableId=$_REQUEST["parentId"];

		if ($rake) {
			$tables=entity_load("node",array($tableId));
			$table=$tables[$tableId];
			$currency=$table->field_netpoker_currency[LANGUAGE_NONE][0]["value"];
			netpoker_transaction($currency,array("nid"=>$tableId),array("uid"=>1),$rake,"Rake");
		}

		watchdog(
			"netpoker_finish_cashgame",
			"gameId=$gameId&rake=$rake&state=$state"
		);

		drupal_json_output(array(
			"ok"=>1
		));
	}

	/**
	 * Poll number of players from server.
	 */
	function netpoker_pollNumPlayers() {
		drupal_session_commit();

		$params=array();

		if (isset($_REQUEST["state"]))
			$params["state"]=$_REQUEST["state"];

		$res=netpoker_server_request("pollNumPlayers",$params);

		drupal_json_output($res);
	}

	/**
	 * Debug function.
	 */
	function netpoker_debug() {
	}
