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
			),

			array(
				"field_name"=>"field_netpoker_registrations",
				"locked"=>TRUE,
				"type"=>"entityreference",
				"cardinality"=>FIELD_CARDINALITY_UNLIMITED,
				"settings"=>array(
					"target_type"=>"user"
				)
			),

			array(
				"field_name"=>"field_netpoker_payout_percent",
				"type"=>"text",
				"locked"=>TRUE,
				"required"=>1,
			),

			array(
				"field_name"=>"field_netpoker_start_time",
				"type"=>"datestamp",
				"locked"=>TRUE
			),

			array(
				"field_name"=>"field_netpoker_bonus",
				"type"=>"number_decimal",
				"locked"=>TRUE
			),

			array(
				"field_name"=>"field_netpoker_fee",
				"type"=>"number_decimal",
				"locked"=>TRUE
			),

			array(
				"field_name"=>"field_netpoker_commission",
				"type"=>"number_decimal",
				"locked"=>TRUE
			),

			array(
				"field_name"=>"field_netpoker_start_chips",
				"type"=>"number_integer",
				"locked"=>TRUE
			),

			array(
				"field_name"=>"field_netpoker_req_registrations",
				"type"=>"number_integer",
				"locked"=>TRUE
			),

			array(
				"field_name"=>"field_netpoker_recurring",
				"type"=>"list_text",
				"locked"=>TRUE,
				"settings"=>array(
					"allowed_values"=>array(
						"instantly"=>"Instantly",
						"daily"=>"Daily",
						"weekly"=>"Weekly",
						"monthly"=>"Monthly",
					),
				),
			),

			array(
				"field_name"=>"field_netpoker_blind_structure",
				"type"=>"text",
				"locked"=>TRUE,
				"required"=>1,
			),

			array(
				"field_name"=>"field_netpoker_level_duration",
				"type"=>"number_integer",
				"locked"=>TRUE,
				"required"=>1,
			),

			array(
				"field_name"=>"field_netpoker_tournament_state",
				"type"=>"text",
				"locked"=>TRUE,
				"required"=>1,
			),

			array(
				"field_name"=>"field_netpoker_tournament_result",
				"type"=>"text",
				"locked"=>TRUE,
			),
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
				"required"=>1,
				"default_value"=>array(
					array(
						"value"=>10
					)
				)
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
			),

			array(
				"field_name"=>"field_netpoker_players",
				"entity_type"=>"node",
				"bundle"=>"pokertournament",
				"label"=>"Number of players per table",
				"required"=>1,
				"default_value"=>array(
					array(
						"value"=>10
					)
				)
			),

			array(
				"field_name"=>"field_netpoker_req_registrations",
				"entity_type"=>"node",
				"bundle"=>"pokertournament",
				"label"=>"Required number of registrations",
			),

			array(
				"field_name"=>"field_netpoker_currency",
				"entity_type"=>"node",
				"bundle"=>"pokertournament",
				"label"=>"Currency",
				"required"=>1
			),

			array(
				"field_name"=>"field_netpoker_start_chips",
				"entity_type"=>"node",
				"bundle"=>"pokertournament",
				"label"=>"Start chips",
				"required"=>1,
				"default_value"=>array(
					array(
						"value"=>1000
					)
				)
			),

			array(
				"field_name"=>"field_netpoker_fee",
				"entity_type"=>"node",
				"bundle"=>"pokertournament",
				"label"=>"Registration fee",
				"required"=>1,
				"default_value"=>array(
					array(
						"value"=>0
					)
				)
			),

			array(
				"field_name"=>"field_netpoker_commission",
				"entity_type"=>"node",
				"bundle"=>"pokertournament",
				"label"=>"Commission",
				"required"=>1,
				"default_value"=>array(
					array(
						"value"=>0
					)
				)
			),

			array(
				"field_name"=>"field_netpoker_bonus",
				"entity_type"=>"node",
				"bundle"=>"pokertournament",
				"label"=>"Bonus",
				"required"=>1,
				"default_value"=>array(
					array(
						"value"=>0
					)
				)
			),

			array(
				"field_name"=>"field_netpoker_recurring",
				"entity_type"=>"node",
				"bundle"=>"pokertournament",
				"label"=>"Recurring"
			),

			array(
				"field_name"=>"field_netpoker_start_time",
				"entity_type"=>"node",
				"bundle"=>"pokertournament",
				"label"=>"Start time",
				"settings"=>array(
					"default_value"=>"blank",
				),
				"description"=>"Leave this blank to create a sit and go tournament."
			),

			array(
				"field_name"=>"field_netpoker_payout_percent",
				"entity_type"=>"node",
				"bundle"=>"pokertournament",
				"label"=>"Payout structure",
				"default_value"=>array(
					array(
						"value"=>"65, 25, 10"
					),
				),
				"description"=>"Comma separated percentages of the prize pool that will be payed to winners.",
				"required"=>TRUE,
			),

			array(
				"field_name"=>"field_netpoker_blind_structure",
				"entity_type"=>"node",
				"bundle"=>"pokertournament",
				"label"=>"Blind structure",
				"default_value"=>array(
					array("value"=>"10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 150, 200, 250, 300, 350, 400, 500, 600, 700, 800, 900, 1000"),
				),
				"description"=>"Comma separated values for big blind.",
				"required"=>TRUE,
			),

			array(
				"field_name"=>"field_netpoker_level_duration",
				"entity_type"=>"node",
				"bundle"=>"pokertournament",
				"label"=>"Level duration",
				"required"=>TRUE,
				"default_value"=>array(
					array(
						"value"=>15
					)
				),
				"description"=>"Duration of each level in minutes."
			),

			array(
				"field_name"=>"field_netpoker_registrations",
				"entity_type"=>"node",
				"bundle"=>"pokertournament",
				"label"=>"Registrations",
				'widget' => array(
					'type' => 'entityreference_autocomplete',
					'settings' => array(
						'match_operator' => 'STARTS_WITH',
					),
					'display' => array(
						'default' => array(
							'label' => 'inline',
							'type' => 'entityreference_label',
							'settings' => array(
								'link' => TRUE,
							),
						),
					),
				),
			),

			array(
				"field_name"=>"field_netpoker_tournament_state",
				"entity_type"=>"node",
				"bundle"=>"pokertournament",
				"label"=>"Tournament state",
				"required"=>TRUE,
				"default_value"=>array(
					array(
						"value"=>"registration"
					)
				),
			),

			array(
				"field_name"=>"field_netpoker_tournament_result",
				"entity_type"=>"node",
				"bundle"=>"pokertournament",
				"label"=>"Tournament result"
			),
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