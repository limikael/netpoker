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
		const PLAYING="playing";
		const FINISHED="finished";
		const CANCELED="canceled";

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

			$this->title="";
			$this->info="";
			$this->seatsPerTable=10;
			$this->startTime=0;
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
			return sizeof($this->getRegistrations())*$this->fee+$this->bonus;
		}

		/**
		 * Get registrations.
		 */
		public function getRegistrations() {
			if (!isset($this->registrations))
				$this->registrations=TournamentRegistration::findAllBy("tournamentId",$this->id);

			return $this->registrations;
		}

		/**
		 * Get prize pool.
		 */
		public function getNumRegistrations() {
			return sizeof($this->getRegistrations());
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
			if (!$user)
				throw new Exception("That's not a user.");

			if ($this->isUserRegistered($user))
				throw new Exception("Already registered.");

			if ($this->state!=Tournament::REGISTRATION)
				throw new Exception("Not in registration state.");

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

			if ($this->state!=Tournament::REGISTRATION)
				throw new Exception("Not in registration state.");

			NetPokerPlugin::init()->makeEntityTransaction(
				$this->currency,
				$this,$user,
				$reg->fee,"Cancel tournament registration");

			$reg->delete();
		}

		/**
		 * Create recurring tournament.
		 */
		private static function createRecurring() {
			// implement...
		}

		/**
		 * Start.
		 */
		public function start() {
			if ($this->state!=Tournament::REGISTRATION)
				throw new Exception("Can't start, not in registration state");

			$this->state=Tournament::PLAYING;
			$this->save();

			$this->createRecurring();
		}

		/**
		 * Cancel the tournament.
		 */
		public function cancel() {
			if ($this->state!=Tournament::REGISTRATION)
				throw new Exception("Can't cancel, the tournament is not in registration state.");

			$this->state=Tournament::CANCELED;
			$this->save();

			$this->createRecurring();
		}

		/**
		 * Finish
		 */
		public function finish($finishOrder, $payout) {
			if ($this->state!=Tournament::PLAYING)
				throw new Exception("Can't finish, not in playing state");

			$finishIndex=0;

			foreach ($finishOrder as $finishUserId) {
				$finishUser=get_user_by("id",$finishUserId);
				$registration=$this->getRegistrationForUser($finishUser);

				$registration->finishIndex=$finishIndex;

				if (isset($payout[$finishIndex])) {
					$out=$payout[$finishIndex];
					$registration->payout=$out;

					NetPokerPlugin::init()->makeEntityTransaction(
						$this->currency,
						$this,$finishUser,
						$out,"Tournament prize"
					);
				}

				$registration->save();
				$finishIndex++;
			}

			$this->state=Tournament::FINISHED;
			$this->save();
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