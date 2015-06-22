<?php

	require_once __DIR__."/../model/Cashgame.php";
	require_once __DIR__."/../utils/ActiveRecord.php";

	/**
	 * The main plugin class.
	 * @class NetPokerPlugin
	 */
	class NetPokerPlugin {

		/**
		 * Install hook.
		 */
		public static function activate() {
			Cashgame::createTable();

			//error_log("done activating...");

			/*$c=new Cashgame();
			$c->title="hello";
			$c->currency="ply";
			$c->numseats=10;
			$c->save();*/

			/*$c->numseats=20;
			$c->save();*/
		}
	}

