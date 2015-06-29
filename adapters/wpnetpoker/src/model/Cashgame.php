<?php

	require_once __DIR__."/../../ext/smartrecord/SmartRecord.php";

	class Cashgame extends SmartRecord {

		public function __construct() {
			$this->minSitInAmount=10;
			$this->maxSitInAmount=100;
			$this->numseats=10;
			$this->stake=2;
			$this->currentNumPlayers=0;
			$this->currency="ply";
		}

		public static function initialize() {
			self::field("id","integer not null auto_increment");
			self::field("title","varchar(255)");
			self::field("currency","varchar(255)");
			self::field("numseats","integer not null");
			self::field("minSitInAmount","integer not null");
			self::field("maxSitInAmount","integer not null");
			self::field("stake","integer not null");
			self::field("currentNumPlayers","integer not null");
		}
	}