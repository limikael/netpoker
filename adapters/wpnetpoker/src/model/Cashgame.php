<?php

	require_once __DIR__."/../utils/ActiveRecord.php";

	class Cashgame extends ActiveRecord {

		public function __construct() {
			$this->minSitIn=10;
			$this->maxSitIn=100;
			$this->numseats=50;
			$this->stake=2;
			$this->currentNumPlayers=0;
		}

		public static function initialize() {
			self::addField("id","integer not null auto_increment");
			self::addField("title","varchar(255)");
			self::addField("currency","varchar(255)");
			self::addField("numseats","integer not null");
			self::addField("minSitIn","integer not null");
			self::addField("maxSitIn","integer not null");
			self::addField("stake","integer not null");
			self::addField("currentNumPlayers","integer not null");
		}
	}