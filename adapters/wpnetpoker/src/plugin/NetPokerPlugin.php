<?php

	require_once __DIR__."/../model/Cashgame.php";
	require_once __DIR__."/../utils/ActiveRecord.php";

	/**
	 * The main plugin class.
	 * @class NetPokerPlugin
	 */
	class NetPokerPlugin {

		private static $instance;

		/**
		 *  Construct.
		 */
		public function __construct($mainFile) {
			register_activation_hook($mainFile,array($this,"activate"));
		}

		/**
		 * Install hook.
		 */
		public function activate() {
			Cashgame::createTable();


			/*$c=new Cashgame();
			$c->title="hello";
			$c->currency="ply";
			$c->numseats=10;
			$c->save();*/

			/*$c->numseats=20;
			$c->save();*/
		}

		/**
		 *
		 */
		public static function init($mainFile) {
			self::$instance=new NetPokerPlugin($mainFile);
		}
	}

