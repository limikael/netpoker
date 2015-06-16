<?php

	/**
	 * Get custom fields.
	 */
	function netpoker_get_fields() {
		return array(
			array(
				"field_name"=>"field_netpoker_players",
				"type"=>"list_integer",
				"required"=>1,
				"locked"=>TRUE,
				"settings"=>array(
					"allowed_values"=>array(2=>2, 4=>4, 6=>6, 10=>10)
				),
			),

			array(
				"field_name"=>"field_netpoker_min_sit_in",
				"type"=>"number_integer",
				"required"=>1,
				"locked"=>TRUE,
			),

			array(
				"field_name"=>"field_netpoker_max_sit_in",
				"type"=>"number_integer",
				"required"=>1,
				"locked"=>TRUE,
			),

			array(
				"field_name"=>"field_netpoker_stake",
				"type"=>"number_integer",
				"required"=>1,
				"locked"=>TRUE,
			),

			array(
				"field_name"=>"field_netpoker_current_players",
				"type"=>"number_integer",
				"locked"=>TRUE,
			),

			array(
				"field_name"=>"field_netpoker_currency",
				"type"=>"list_text",
				"required"=>1,
				"locked"=>TRUE,
				"settings"=>array(
					"allowed_values_function" => "netpoker_get_curreny_field_allowed_values"
				),
			),

			array(
				"field_name"=>"field_netpoker_rake_percent",
				"type"=>"number_decimal",
				"locked"=>TRUE,
				"required"=>1,
			),

			array(
				"field_name"=>"field_netpoker_playmoney",
				"locked"=>TRUE,
				"type"=>"number_integer",
			)
		);
	}

	/**
	 * Get custom field instances.
	 */
	function netpoker_get_field_instances() {
		return array(
			array(
				"field_name"=>"field_netpoker_players",
				"entity_type"=>"node",
				"bundle"=>"pokergame",
				"label"=>"Number of players",
				"required"=>1
      		),

			array(
				"field_name"=>"field_netpoker_currency",
				"entity_type"=>"node",
				"bundle"=>"pokergame",
				"label"=>"Currency",
				"required"=>1
      		),

			array(
				"field_name"=>"field_netpoker_min_sit_in",
				"entity_type"=>"node",
				"bundle"=>"pokergame",
				"label"=>"Min sit in amount",
				"required"=>1
      		),

			array(
				"field_name"=>"field_netpoker_max_sit_in",
				"entity_type"=>"node",
				"bundle"=>"pokergame",
				"label"=>"Max sit in amount",
				"required"=>1
			),

			array(
				"field_name"=>"field_netpoker_stake",
				"entity_type"=>"node",
				"bundle"=>"pokergame",
				"label"=>"Stake (big blind)",
				"required"=>1
			),

			array(
				"field_name"=>"field_netpoker_current_players",
				"entity_type"=>"node",
				"bundle"=>"pokergame",
				"label"=>"Current number of players"
			),

			array(
				"field_name"=>"field_netpoker_rake_percent",
				"entity_type"=>"node",
				"bundle"=>"pokergame",
				"label"=>"Rake percent",
				"required"=>1,
				"default_value"=>array(
					array(
						"value"=>2.0
					)
				)
			),

			array(
				"field_name"=>"field_netpoker_playmoney",
				"entity_type"=>"user",
				"bundle"=>"user",
				"label"=>"Poker Playmoney",
				"widget"=>array(
					"type"=>"number_integer"
				)
			)
		);
	}

	/**
	 * Get default values for variables.
	 */
	function netpoker_get_variable_defaults() {
		return array(
			"netpoker_gameplay_key"=>md5(rand().microtime()),
			"netpoker_cashgame_id"=>1001,
			"netpoker_gameplay_server_port"=>8881,
			"netpoker_default_playmoney"=>1000,
			"netpoker_communicate_with_server"=>FALSE,
			"netpoker_gameplay_server_host"=>NULL,
			"netpoker_gameplay_server_to_server_host"=>NULL
		);
	}