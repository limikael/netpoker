<?php

	require_once __DIR__."/../model/Cashgame.php";
	require_once __DIR__."/../utils/ActiveRecord.php";
	require_once __DIR__."/../utils/Singleton.php";

	/**
	 * The main plugin class.
	 * @class NetPokerPlugin
	 */
	class NetPokerPlugin extends Singleton {

		private $optionDefaults;
		private $mainFile;

		/**
		 *  Construct.
		 */
		public function __construct() {
			$this->optionDefaults=array(
				"netpoker_gameplay_key"=>md5(rand().microtime()),
				"netpoker_cashgame_id"=>1001,
				"netpoker_gameplay_server_port"=>8881,
				"netpoker_default_playmoney"=>1000,
				"netpoker_communicate_with_server"=>FALSE,
				"netpoker_gameplay_server_host"=>NULL,
				"netpoker_gameplay_server_to_server_host"=>NULL
			);

			$mainFile=WP_PLUGIN_DIR."/wpnetpoker/wpnetpoker.php";

			register_activation_hook($mainFile,array($this,"activate"));
			register_uninstall_hook($mainFile,array("NetPokerPlugin","uninstall"));

			add_action("wp_logout",array($this,"wp_logout"));
		}

		/**
		 * Logout.
		 */
		public function wp_logout() {
			session_start();
			unset($_SESSION["netpoker_user_id"]);
		}

		/**
		 * Install hook.
		 */
		public function activate() {
			foreach ($this->optionDefaults as $option=>$default)
				if (!get_option($option))
					update_option($option,$default);

			Cashgame::createTable();
		}

		/**
		 * Uninstall.
		 * Must be static.
		 */
		public static function uninstall() {
			$instance=self::init();

			foreach ($instance->optionDefaults as $option=>$default)
				delete_option($option);

			Cashgame::dropTable();
		}

		/**
		 * Get gameplay server host.
		 */
		public function getGameplayServerHost() {
			if (get_option("netpoker_gameplay_server_host"))
				return get_option("netpoker_gameplay_server_host");

			return $_SERVER["SERVER_NAME"];
		}

		/**
		 * Get user ply balance.
		 */
		public function getUserPlyBalance($userId) {
			$user=get_user_by("id",$userId);
			if (!$user)
				throw new Exception("User not found");

			$value=get_user_meta($userId,"netpoker_playmoney_balance",TRUE);

			if ($value==="")
				$value=get_option("netpoker_default_playmoney");

			return $value;
		}

		/**
		 * Change user ply balance.
		 */
		public function changeUserPlyBalance($userId, $amount) {
			$balance=$this->getUserPlyBalance($userId);
			$balance+=$amount;

			if ($balance<0)
				throw new Exception("Not enough balance.");

			update_user_meta($userId,"netpoker_playmoney_balance",$balance);
		}
	}

