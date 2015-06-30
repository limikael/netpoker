<?php

	namespace wpnetpoker;

	require_once __DIR__."/../../ext/smartrecord/SmartRecord.php";

	use \SmartRecord;
	use \Exception;

	/**
	 * Tournament registration.
	 */
	class TournamentRegistration extends SmartRecord {

		/**
		 * Constructor.
		 */
		public function __construct($tournament=NULL, $user=NULL, $fee=NULL) {
			if ($tournament)
				$this->tournamentId=$tournament->id;

			if ($user) {
				$this->userId=$user->ID;
				$this->userName=$user->display_name;
			}

			if ($fee)
				$this->fee=$fee;

			else
				$this->fee=0;

			$this->prize=0;
		}

		/**
		 * Initialize datbase fields.
		 */
		public static function initialize() {
			self::field("id","integer not null auto_increment");
			self::field("tournamentId","integer not null");
			self::field("userId","integer not null");
			self::field("userName","varchar(255) not null");
			self::field("prize","decimal");
			self::field("fee","decimal");
		}
	}
