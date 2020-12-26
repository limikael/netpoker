<?php

	/**
	 * Get the host when users should connect to the gameplay server.
	 */
	function netpoker_get_gameplay_server_host() {
		$host=variable_get("netpoker_gameplay_server_host");
		if (!$host)
			$host=$_SERVER["SERVER_NAME"];

		return $host;
	}

	/**
	 * Get the host where there server should connect for
	 * talking to the gameplay server.
	 */
	function netpoker_get_gameplay_server_to_server_host() {
		$host=variable_get("netpoker_gameplay_server_to_server_host");

		if (!$host)
			$host=netpoker_get_gameplay_server_host();

		return $host;
	}

	/**
	 * Make a request to the backend server.
	 */
	function netpoker_server_request($method, $params=array()) {
		if (!module_exists("netpoker")) {
			//watchdog("netpoker","netpoker_server_request: module disabled",array(),WATCHDOG_WARNING);
			return NULL;
			return;
		}

		$curl=curl_init();

		$url=
			"http://".
			netpoker_get_gameplay_server_to_server_host().":".
			variable_get("netpoker_gameplay_server_port")."/".
			$method;

		$params["key"]=variable_get("netpoker_gameplay_key");

		$url.="?".http_build_query($params);

		//watchdog("netpoker","calling: ".$url);

		curl_setopt($curl,CURLOPT_URL,$url);
		curl_setopt($curl,CURLOPT_RETURNTRANSFER,TRUE);
		$res=curl_exec($curl);

		if (!$res) {
			watchdog("netpoker","Backend call failed: ".$method,array(),WATCHDOG_ERROR);
			return NULL;
		}

		return json_decode($res,TRUE);
	}

	/**
	 * Get available currencies. This depends on which other modules are available.
	 */
	function netpoker_get_available_currencies() {
		$currencies=array();
		$currencies[]="ply";

		if (module_exists("blockchainaccounts"))
			$currencies[]="bits";

		return $currencies;
	}

	/**
	 * Get balance.
	 */
	function netpoker_get_balance($currency, $accountspec) {
		switch (strtolower($currency)) {
			case "bits":
				return blockchainaccounts_get_balance($currency, $accountspec);
				break;

			case "ply":
				if (isset($accountspec["nid"]))
					return 0;

				if (!$accountspec["uid"])
					throw new Exception("Unknown account spec.");

				$balance=variable_get("netpoker_default_playmoney");
				$user=user_load($accountspec["uid"]);

				if (!$user)
					netpoker_fail("User does not exist.");

				if (isset($user->field_netpoker_playmoney[LANGUAGE_NONE][0]["value"]))
					$balance=$user->field_netpoker_playmoney[LANGUAGE_NONE][0]["value"];

				return intval($balance);
				break;

			default:
				throw new Exception("Unknown currency: ".$currency);
				break;
		}
	}

	/**
	 * Change playmoney balance for user.
	 */
	function netpoker_transaction($currency, $from, $to, $amount, $label) {
		if ($amount<0)
			throw new Exception("Can't make transaction with negative amount");

		switch (strtolower($currency)) {
			case "bits":
				return blockchainaccounts_transaction($currency, $from, $to, $amount, $label);
				break;

			case "ply":
				if (isset($from["uid"]))
					netpoker_change_playmoney_balance($from["uid"],-$amount);

				if (isset($to["uid"]))
					netpoker_change_playmoney_balance($to["uid"],$amount);
				break;

			default:
				throw new Exception("Unknown currency: ".$currency);
				break;
		}
	}

	/**
	 * Change playmoney balance.
	 */
	function netpoker_change_playmoney_balance($userId, $amount) {
		$current=netpoker_get_balance("ply",array("uid"=>$userId));

		if ($amount<-$current)
			throw new Exception("Not enough playmoney balance.");

		$current+=$amount;
		$user=user_load($userId);

		if (!$user)
			throw new Exception("User does not exist.");

		$user->field_netpoker_playmoney[LANGUAGE_NONE][0]["value"]=$current;
		field_attach_update("user",$user);
		user_save($user);
	}
