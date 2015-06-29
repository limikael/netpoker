<?php

	namespace wpnetpoker;

	require_once __DIR__."/../../ext/smartrecord/SmartRecord.php";
	require_once __DIR__."/TournamentRegistration.php";

	use \SmartRecord;
	use \Exception;

	/**
	 * Tournament.
	 */
	class Tournament extends SmartRecord {

		const REGISTRATION="registration";

		/**
		 * Constructor.
		 */
		public function __construct() {
			$this->currency="ply";
			$this->fee=0;
			$this->commission=0;
			$this->bonus=0;
			$this->startChips=1000;
			$this->state=Tournament::REGISTRATION;
			$this->minRegistrations=0;
			$this->levelDuration=15;

			$this->blindLevels="20, 40, 60, 80, 100";
			$this->payoutPercent="65, 25, 10";
		}

		/**
		 * Get total fee.
		 */
		public function getTotalFee() {
			return $this->fee+$this->commission;
		}

		/**
		 * Get prize pool.
		 */
		public function getPrizePool() {
			return 123;
		}

		/**
		 * Get registrations.
		 */
		public function getRegistrations() {
			if (!$this->registrations)
				$this->registrations=TournamentRegistration::findAllBy("tournamentId",$this->id);

			return $this->registrations;
		}

		/**
		 * Get prize pool.
		 */
		public function getNumRegistrations() {
			return 1;
		}

		/**
		 * Get info data.
		 */
		public function getInfoData() {
			$data=array();

			$data["id"]=$this->id;
			$data["seatsPerTable"]=$this->seatsPerTable;
			$data["startChips"]=$this->startChips;

			$data["fee"]=floatval($this->fee);
			$data["commission"]=floatval($this->commission);
			$data["bonus"]=floatval($this->bonus);

			$data["state"]=$this->state;

			if ($this->startTime)
				$data["startTime"]=$this->startTime;

			$data["payoutPercent"]=array();
			foreach (explode(",",$node->payoutPercent) as $payoutLevel)
				$data["payoutPercent"][]=floatval($payoutLevel);

			$data["blindStructure"]=array();
			foreach (explode(",",$node->blindLevels) as $blindLevel)
				$data["blindStructure"][]=array(
					"time"=>60*floatval($node->levelDuration),
					"stake"=>floatval($blindLevel),
					"ante"=>0
				);

			$data["users"]=array();
			foreach ($this->getRegistrations() as $reg) {
				$data["users"][]=array(
					"id"=>$reg->userId,
					"name"=>$reg->userName
				);
			}

			return $data;
		}

		/**
		 * Is this user registered?
		 */
		public function isUserRegistered($user) {
			foreach ($this->getRegistrations() as $reg)
				if ($user->ID==$reg->userId)
					return TRUE;

			return FALSE;
		}

		/**
		 * Get registration record for user.
		 */
		public function getRegistrationForUser($user) {
			foreach ($this->getRegistrations() as $reg)
				if ($user->ID==$reg->userId)
					return $reg;

			return NULL;
		}

		/**
		 * Register user.
		 */
		public function registerUser($user) {
			if ($this->isUserRegistered($user))
				throw new Exception("Already registered.");

			NetPokerPlugin::init()->makeEntityTransaction(
				$this->currency,
				$user,$this,
				$this->getTotalFee(),"Tournament registration");

			$registration=new TournamentRegistration($this,$user,$this->getTotalFee());
			$registration->save();
		}

		/**
		 * Register user.
		 */
		public function unregisterUser($user) {
			$reg=$this->getRegistrationForUser($user);
			if (!$reg)
				throw new Exception("Not registered.");

			NetPokerPlugin::init()->makeEntityTransaction(
				$this->currency,
				$this,$user,
				$reg->fee,"Cancel tournament registration");

			$reg->delete();
		}

		/**
		 * Initialize datbase fields.
		 */
		public static function initialize() {
			self::field("id","integer not null auto_increment");
			self::field("title","varchar(255) not null");
			self::field("info","text");
			self::field("currency","varchar(255) not null");
			self::field("seatsPerTable","integer not null");
			self::field("fee","decimal not null");
			self::field("commission","decimal not null");
			self::field("bonus","decimal not null");
			self::field("startChips","integer not null");
			self::field("startTime","integer");
			self::field("state","varchar(32) not null");
			self::field("minRegistrations","integer");
			self::field("levelDuration","integer not null");
			self::field("blindLevels","text not null");
			self::field("payoutPercent","text not null");
		}
	}