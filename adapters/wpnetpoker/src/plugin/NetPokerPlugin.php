<?php

	namespace wpnetpoker;

	require_once __DIR__."/../model/Cashgame.php";
	require_once __DIR__."/../model/Tournament.php";
	require_once __DIR__."/../model/TournamentRegistration.php";
	require_once __DIR__."/../utils/Singleton.php";

	use \Exception;

	/**
	 * The main plugin class.
	 * @class NetPokerPlugin
	 */
	class NetPokerPlugin extends Singleton {

		const DBVERSION=12;

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
				"netpoker_gameplay_server_to_server_host"=>NULL,
				"netpoker_dbversion"=>self::DBVERSION
			);

			$mainFile=WP_PLUGIN_DIR."/wpnetpoker/wpnetpoker.php";

			register_activation_hook($mainFile,array($this,"activate"));
			register_uninstall_hook($mainFile,array('wpnetpoker\NetPokerPlugin',"uninstall"));

			add_action("wp_logout",array($this,"wp_logout"));

			if (get_option("netpoker_dbversion") && 
					get_option("netpoker_dbversion")!=self::DBVERSION) {
				$this->activate();
				update_option("netpoker_dbversion",self::DBVERSION);
			}
		}

		/**
		 * Logout.
		 */
		public function wp_logout() {
			if (!session_id())
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

			Cashgame::install();
			Tournament::install();
			TournamentRegistration::install();

			update_option("netpoker_dbversion",self::DBVERSION);
		}

		/**
		 * Uninstall.
		 * Must be static.
		 */
		public static function uninstall() {
			$instance=self::init();

			foreach ($instance->optionDefaults as $option=>$default)
				delete_option($option);

			Cashgame::uninstall();
			Tournament::uninstall();
			TournamentRegistration::install();
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
		 * Get gameplay server host.
		 */
		public function getGameplayServerToServerHost() {
			if (get_option("netpoker_gameplay_server_to_server_host"))
				return get_option("netpoker_gameplay_server_to_server_host");

			return $this->getGameplayServerHost();
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

		/**
		 * Use current game id.
		 */
		public function useGameId() {
			$id=get_option("netpoker_cashgame_id");

			update_option("netpoker_cashgame_id",$id+1);

			return $id;
		}

		/**
		 * Reload table info in server if enabled.
		 */
		public function reloadTablesConditionally() {
			if (!get_option("netpoker_communicate_with_server"))
				return;

			$this->serverRequest("reloadTables");
		}

		/**
		 * Server request.
		 */
		public function serverRequest($method, $params=array()) {
			$curl=curl_init();

			$url=
				"http://".
				$this->getGameplayServerToServerHost().":".
				get_option("netpoker_gameplay_server_port")."/".
				$method;

			$params["key"]=get_option("netpoker_gameplay_key");

			$url.="?".http_build_query($params);

			curl_setopt($curl,CURLOPT_URL,$url);
			curl_setopt($curl,CURLOPT_RETURNTRANSFER,TRUE);
			$res=curl_exec($curl);

			if (!$res) {
				error_log("backend call failed: ".$method);
				return NULL;
			}

			return json_decode($res,TRUE);
		}

		/**
		 * Get entity account.
		 */
		public function getBcaEntityAccount($entity) {
			switch (get_class($entity)) {
				case 'WP_User':
					return bca_user_Account($entity);
					break;

				case 'wpnetpoker\Cashgame':
					return bca_entity_account("cashgame",$entity->id);
					break;

				case 'wpnetpoker\Tournament':
					return bca_entity_account("tournament",$entity->id);
					break;

				default:
					throw new Exception("No account for entity of class: ".get_class($entity));
			}
		}

		/**
		 * Get entity balance.
		 */
		public function getEntityBalance($currency, $entity) {
			switch ($currency) {
				case "ply":
					if (get_class($entity)!="WP_User")
						throw new Exception("Only users have playmoney accounts, really.");

					return $this->getUserPlyBalance($entity->ID);
					break;

				case "bits":
					return $this->getBcaEntityAccount($entity)->getBalance("bits");
					break;

				default:
					throw new Exception("Unknown currency: ".$currency);
					break;
			}
		}

		/**
		 * Make transaction.
		 */
		public function makeEntityTransaction($currency, $fromEntity, $toEntity, $amount, $message) {
			switch ($currency) {
				case "ply":
					if (get_class($fromEntity)=="WP_User")
						$this->changeUserPlyBalance($fromEntity->ID,-$amount);

					if (get_class($toEntity)=="WP_User")
						$this->changeUserPlyBalance($toEntity->ID,$amount);

					break;

				case "bits":
					bca_make_transaction("bits",
						$this->getBcaEntityAccount($fromEntity),
						$this->getBcaEntityAccount($toEntity),
						$amount,$message
					);
					break;

				default:
					throw new Exception("Unknown currency: ".$currency);
					break;
			}
		}
	}
