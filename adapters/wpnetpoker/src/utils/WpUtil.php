<?php

	/**
	 * Wordpress utils.
	 */
	class WpUtil {

		/**
		 * Bootstrap from inside a plugin.
		 */
		public static function getWpLoadPath() {
			$path=$_SERVER['SCRIPT_FILENAME'];

			for ($i=0; $i<4; $i++)
				$path=dirname($path);

			return $path."/wp-load.php";
		}

		/**
		 * Create a PDO object that is compatible with the current
		 * wordpress install.
		 */
		public static function createCompatiblePdo() {
			return new PDO("mysql:host=".DB_HOST.";dbname=".DB_NAME,DB_USER,DB_PASSWORD);
		}
	}