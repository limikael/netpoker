<?php

namespace netpoker;

require_once __DIR__."/../../ext/wprecord/WpRecord.php";

class Game extends \WpRecord {
	public static function initialize() {
		self::field("id","integer not null auto_increment");
		self::field("post_id","integer not null");
		self::field("stamp","datetime not null");
		self::field("state","text not null");
	}
}