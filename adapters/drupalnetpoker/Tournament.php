<?php

	require_once __DIR__."/netpoker.functions.php";

	/**
	 * Abstraction for tournament related stuff.
	 */
	class Tournament {

		const REGISTRATION="registration";
		const PLAYING="playing";
		const FINISHED="finished";
		const CANCELED="canceled";

		/**
		 * Constructor.
		 */
		public function __construct($tournamentId) {
			$this->node=node_load($tournamentId);

			if (!$this->node)
				throw new Exception("Can't find tournament");

			if ($this->node->type!="pokertournament")
				throw new Exception("This is not a tournament node");
		}

		/**
		 * Getter.
		 */
		public function getCurrency() {
			return $this->node->field_netpoker_currency[LANGUAGE_NONE][0]["value"];
		}

		/**
		 * Getter.
		 */
		public function getTotalFee() {
			return 
				floatval($this->node->field_netpoker_fee[LANGUAGE_NONE][0]["value"]) +
				floatval($this->node->field_netpoker_commission[LANGUAGE_NONE][0]["value"]);
		}

		/**
		 * Get current state.
		 */
		public function getCurrentState() {
			return $this->node->field_netpoker_tournament_state[LANGUAGE_NONE][0]["value"];
		}

		/**
		 * Set current state.
		 */
		public function setState($state) {
			$this->node->field_netpoker_tournament_state[LANGUAGE_NONE][0]["value"]=$state;
		}

		/**
		 * Get data for the tournamentInfo call.
		 */
		public function getInfoData() {
			$node=$this->node;

			$data=array(
				"ok"=>1,
				"id"=>$node->nid,
				"seatsPerTable"=>intval($node->field_netpoker_players[LANGUAGE_NONE][0]["value"]),
				"startChips"=>intval($node->field_netpoker_start_chips[LANGUAGE_NONE][0]["value"]),
				"fee"=>floatval($node->field_netpoker_fee[LANGUAGE_NONE][0]["value"]),
				"bonus"=>floatval($node->field_netpoker_bonus[LANGUAGE_NONE][0]["value"]),
				"info"=>$node->title,
				"state"=>$node->field_netpoker_tournament_state[LANGUAGE_NONE][0]["value"],
			);

			if (isset($node->field_netpoker_req_registrations[LANGUAGE_NONE][0]["value"]))
				$data["requiredRegistrations"]=intval($node->field_netpoker_req_registrations[LANGUAGE_NONE][0]["value"]);

			$data["payoutPercent"]=array();

			foreach (explode(",",$node->field_netpoker_payout_percent[LANGUAGE_NONE][0]["value"]) as $payoutLevel)
				$data["payoutPercent"][]=floatval($payoutLevel);

			$data["blindStructure"]=array();

			foreach (explode(",",$node->field_netpoker_blind_structure[LANGUAGE_NONE][0]["value"]) as $blindLevel)
				$data["blindStructure"][]=array(
					"time"=>60*floatval($node->field_netpoker_level_duration[LANGUAGE_NONE][0]["value"]),
					"stake"=>floatval($blindLevel),
					"ante"=>0
				);

			$userIds=[];

			if (isset($this->node->field_netpoker_registrations[LANGUAGE_NONE])) {
				foreach ($this->node->field_netpoker_registrations[LANGUAGE_NONE] as $entry)
					$userIds[]=$entry["target_id"];
			}

			$users=entity_load("user",$userIds);

			$data["users"]=array();
			foreach ($users as $user) {
				$data["users"][]=array(
					"id"=>$user->uid,
					"name"=>$user->name
				);
			}

			if (isset($node->field_netpoker_start_time[LANGUAGE_NONE][0]["value"]))
				$data["startTime"]=$node->field_netpoker_start_time[LANGUAGE_NONE][0]["value"];

			if (isset($this->node->field_netpoker_tournament_result[LANGUAGE_NONE][0]["value"])) {
				$data["finishorder"]=array();

				$result=json_decode($this->node->field_netpoker_tournament_result[LANGUAGE_NONE][0]["value"],TRUE);

				foreach ($result as $res)
					$data["finishorder"][]=$res["userId"];
			}

			return $data;
		}

		/**
		 * Register a user for this tournament.
		 */
		public function isUserRegistered($userId) {
			if (!isset($this->node->field_netpoker_registrations[LANGUAGE_NONE]))
				return FALSE;

			foreach ($this->node->field_netpoker_registrations[LANGUAGE_NONE] as $entry)
				if ($entry["target_id"]==$userId)
					return TRUE;

			return FALSE;
		}

		/**
		 * Register a user for this tournament.
		 */
		public function registerUser($userId) {
			$user=user_load($userId);
			if (!$user)
				throw new Exception("User does not exist.");

			if ($this->getCurrentState()!=Tournament::REGISTRATION)
				throw new Exception("The tournament is not in registration state.");

			if ($this->isUserRegistered($userId))
				throw new Exception("User is already registered.");

			netpoker_transaction(
				$this->getCurrency(),
				array("uid"=>$userId),
				array("nid"=>$this->node->nid),
				$this->getTotalFee(),
				"Tournament registration"
			);

			$this->node->field_netpoker_registrations[LANGUAGE_NONE][]=array(
				"target_id"=>$userId,
				"target_type"=>"user"
			);

			node_save($this->node);
		}

		/**
		 * Unregister a user for this tournament.
		 */
		public function unregisterUser($userId) {
			$user=user_load($userId);
			if (!$user)
				throw new Exception("User does not exist.");

			if ($this->getCurrentState()!="registration")
				throw new Exception("The tournament is not in registration state.");

			if (!$this->isUserRegistered($userId))
				throw new Exception("User is not registered.");

			netpoker_transaction(
				$this->getCurrency(),
				array("nid"=>$this->node->nid),
				array("uid"=>$userId),
				$this->getTotalFee(),
				"Cancel tournament registration"
			);

			foreach ($this->node->field_netpoker_registrations[LANGUAGE_NONE] as $k=>$entry) {
				if ($entry["target_id"]==$userId) {
					unset($this->node->field_netpoker_registrations[LANGUAGE_NONE][$k]);
				}
			}

			node_save($this->node);
		}

		/**
		 * Start the tournament.
		 */
		public function start() {
			if ($this->getCurrentState()!=Tournament::REGISTRATION)
				throw new Exception("Can't start, the tournament is not in registration state.");

			$this->setState(Tournament::PLAYING);
			node_save($this->node);

			$this->createRecurring();
		}

		/**
		 * Cancel the tournament.
		 */
		public function cancel() {
			if ($this->getCurrentState()!=Tournament::REGISTRATION)
				throw new Exception("Can't cancel, the tournament is not in registration state.");

			$this->setState(Tournament::CANCELED);
			node_save($this->node);

			$this->createRecurring();
		}

		/**
		 * Finish the tournament.
		 */
		public function finish($finishOrder, $payout) {
			if ($this->getCurrentState()!=Tournament::PLAYING)
				throw new Exception("Can't finish, the tournament is not in playing state.");

			$this->setState(Tournament::FINISHED);

			for ($i=0; $i<sizeof($payout); $i++) {
				netpoker_transaction(
					$this->getCurrency(),
					array("nid"=>$this->node->nid),
					array("uid"=>$finishOrder[$i]),
					$payout[$i],
					"Tournament prize"
				);
			}

			netpoker_transaction(
				$this->getCurrency(),
				array("nid"=>$this->node->nid),
				array("uid"=>1),
				netpoker_get_balance($this->getCurrency(),array("nid"=>$this->node->nid)),
				"Tournament commission"
			);

			$result=[];
			for ($i=0; $i<sizeof($finishOrder); $i++) {
				$r=array();
				$r["userId"]=$finishOrder[$i];

				if (isset($payout[$i]))
					$r["payout"]=$payout[$i];

				else
					$r["payout"]=0;

				$result[]=$r;
			}

			$this->node->field_netpoker_tournament_result[LANGUAGE_NONE][0]["value"]=json_encode($result);

			node_save($this->node);
		}

		/**
		 * Create recurring tournament.
		 */
		public function createRecurring() {
			if (!isset($this->node->field_netpoker_recurring[LANGUAGE_NONE][0]["value"]))
				return;

			$recurring=$this->node->field_netpoker_recurring[LANGUAGE_NONE][0]["value"];

			if (!$recurring)
				return;

			$node=new stdClass();
			$node->title=$this->node->title;
			$node->type="pokertournament";
			node_object_prepare($node);
			$node->language=LANGUAGE_NONE;
			$node->uid=1;
			$node->status=1;
			$node->promote=0;
			$node->comment=$this->node->comment;

			$node->field_netpoker_currency=$this->node->field_netpoker_currency;
			$node->field_netpoker_players=$this->node->field_netpoker_players;
			$node->field_netpoker_req_registrations=$this->node->field_netpoker_req_registrations;
			$node->field_netpoker_start_chips=$this->node->field_netpoker_start_chips;
			$node->field_netpoker_fee=$this->node->field_netpoker_fee;
			$node->field_netpoker_commission=$this->node->field_netpoker_commission;
			$node->field_netpoker_bonus=$this->node->field_netpoker_bonus;
			$node->field_netpoker_payout_percent=$this->node->field_netpoker_payout_percent;
			$node->field_netpoker_blind_structure=$this->node->field_netpoker_blind_structure;
			$node->field_netpoker_level_duration=$this->node->field_netpoker_level_duration;

			$node->field_netpoker_tournament_state[LANGUAGE_NONE][0]["value"]="registration";

			$start_time=NULL;
			if (isset($this->node->field_netpoker_start_time[LANGUAGE_NONE][0]["value"]))
				$start_time=$this->node->field_netpoker_start_time[LANGUAGE_NONE][0]["value"];

			if ($start_time && $recurring=="instantly")
				throw new Exception("Can't have an instantly recurring tournament with a start time.");

			if (!$start_time && $recurring!="inastantly")
				throw new Exception("Can't have an non-instantly recurring tournament without a start time.");

			switch ($recurring) {
				case "instantly":
					$new_start_time=NULL;
					break;

				case "daily":
					$new_start_time=date_timestamp_get(date_add(
						date_create("@$start_time"),
						date_interval_create_from_date_string("1 day")
					));
					break;

				case "weekly":
					$new_start_time=date_timestamp_get(date_add(
						date_create("@$start_time"),
						date_interval_create_from_date_string("1 week")
					));
					break;

				case "monthly":
					$new_start_time=date_timestamp_get(date_add(
						date_create("@$start_time"),
						date_interval_create_from_date_string("1 month")
					));
					break;

				default:
					throw new Exception("Unknown recurring type: ".$recurring);
			}

			$node->field_netpoker_start_time[LANGUAGE_NONE][0]["value"]=$new_start_time;

			$node = node_submit($node);
			node_save($node);

			return $node->nid;
		}
	}