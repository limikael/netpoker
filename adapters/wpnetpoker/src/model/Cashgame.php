<?php

	require_once __DIR__."/../utils/ActiveRecord.php";

	class Cashgame extends ActiveRecord {

		public function __construct() {
			$this->minSitInAmount=10;
			$this->maxSitInAmount=100;
			$this->numseats=10;
			$this->stake=2;
			$this->currentNumPlayers=0;
			$this->currency="ply";
		}

		public static function initialize() {
			self::addField("id","integer not null auto_increment");
			self::addField("title","varchar(255)");
			self::addField("currency","varchar(255)");
			self::addField("numseats","integer not null");
			self::addField("minSitInAmount","integer not null");
			self::addField("maxSitInAmount","integer not null");
			self::addField("stake","integer not null");
			self::addField("currentNumPlayers","integer not null");
		}
	}