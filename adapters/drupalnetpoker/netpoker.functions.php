<?php

	function netpoker_get_gameplay_server_host() {
		$host=variable_get("netpoker_gameplay_server_host");
		if (!$host)
			$host=$_SERVER["SERVER_NAME"];

		return $host;
	}

	function netpoker_get_gameplay_server_to_server_host() {
		$host=variable_get("netpoker_gameplay_server_to_server_host");

		if (!$host)
			$host=netpoker_get_gameplay_server_host();

		return $host;
	}

	function netpoker_server_request($method, $params=array()) {
		$curl=curl_init();

		$url=
			"http://".
			netpoker_get_gameplay_server_to_server_host().":".
			variable_get("netpoker_gameplay_server_port")."/".
			$method;

		$params["key"]=variable_get("netpoker_gameplay_key");

		$url.="?".http_build_query($params);

		watchdog("netpoker","calling: ".$url);

		curl_setopt($curl,CURLOPT_URL,$url);
		curl_setopt($curl,CURLOPT_RETURNTRANSFER,TRUE);
		$res=curl_exec($curl);

		if (!$res) {
			watchdog("netpoker","Backend call failed: ".$method,array(),WATCHDOG_ERROR);
			return NULL;
		}

		return json_decode($res,TRUE);
	}