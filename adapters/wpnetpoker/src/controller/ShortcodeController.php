<?php

	namespace wpnetpoker;

	require_once __DIR__."/../utils/Template.php";
	require_once __DIR__."/../utils/Singleton.php";
	require_once __DIR__."/../plugin/NetPokerPlugin.php";
	require_once __DIR__."/../model/Cashgame.php";
	require_once __DIR__."/../model/Tournament.php";

	use \Exception;

	/**
	 * Handle shortcodes related to cashgames.
	 */
	class ShortcodeController extends Singleton {

		/**
		 * Construct.
		 */
		public function __construct() {
			add_shortcode("netpoker_cashgame_list", array($this, "netpoker_cashgame_list"));
			add_shortcode("netpoker_playmoney_balance", array($this, "netpoker_playmoney_balance"));
			add_shortcode("netpoker_tournament_list", array($this, "netpoker_tournament_list"));
			add_shortcode("netpoker_ply_toplist", array($this, "netpoker_ply_toplist"));
			add_shortcode("netpoker_ply_topup_button", array($this, "netpoker_ply_topup_button"));

			add_action("wp_enqueue_scripts",array($this,"wp_enqueue_scripts"));
		}

		/**
		 * Enqueue scripts.
		 */
		public function wp_enqueue_scripts() {
			wp_register_style('netpoker', plugins_url()."/wpnetpoker/res/wpnetpoker.css");
		}

		/**
		 * List cashgames.
		 */
		public function netpoker_cashgame_list() {
			wp_enqueue_style("netpoker");

			$template=new Template(__DIR__."/../template/netpoker_cashgame_list.php");
			$template->set("items",Cashgame::findAll());

			return $template->render();
		}

		/**
		 * Show playmoney balance.
		 */
		public function netpoker_playmoney_balance() {
			wp_enqueue_style("netpoker");

			$user=wp_get_current_user();

			if (!$user || !$user->ID)
				return;

			$balance=NetPokerPlugin::init()->getUserPlyBalance($user->ID);

			return $balance;
		}

		/**
		 * Tournament list.
		 */
		public function netpoker_tournament_list() {
			wp_enqueue_style("netpoker");

			$template=new Template(__DIR__."/../template/netpoker_tournament_list.php");
			$template->set("items",Tournament::findAll());

			return $template->render();
		}

		/**
		 * Topup button.
		 */
		public function netpoker_ply_topup_button($p) {
			$user=wp_get_current_user();

			if (!$user || !$user->ID)
				return "<i>Not logged in.</i>";

			if (isset($_REQUEST["do_ply_topup"])) {
				$defaultPlaymoney=get_option("netpoker_default_playmoney");
				$current=NetPokerPlugin::init()->getUserPlyBalance($user->ID);

				if ($current<$defaultPlaymoney) {
					update_user_meta($user->ID,"netpoker_playmoney_balance",$defaultPlaymoney);
					echo '<div class="updated"><strong>Your PLY has been replenished.</strong></div>';
				}

				else {
					echo '<div class="updated"><strong>You have enough already :)</strong></div>';
				}
			}

			$template=new Template(__DIR__."/../template/netpoker_ply_topup_button.php");

			return $template->render();
		}

		/**
		 * Escape values in array.
		 */
		private static function esc_array($a) {
			$r=array();

			foreach ($a as $item)
				$r[]="'".esc_sql($item)."'";

			return join(",",$r);
		}

		/**
		 * Playmoney toplist.
		 */
		public function netpoker_ply_toplist($p) {
			global $wpdb;

			wp_enqueue_style("netpoker");

			$defaultBalance=intval(get_option("netpoker_default_playmoney"));

			$exclude_users=array("");

			if (isset($p["exclude_users"]))
				$exclude_users=explode(",",$p["exclude_users"]);

			$exclude_users_s=self::esc_array($exclude_users);

			$items=$wpdb->get_results(
				"SELECT    u.ID, u.display_name AS name, ".
				"          IF(m.meta_value IS NOT NULL, CAST(m.meta_value AS DECIMAL), $defaultBalance) AS balance ".
				"FROM      wp_users AS u ".
				"LEFT JOIN wp_usermeta AS m ON u.ID=m.user_id AND m.meta_key='netpoker_playmoney_balance' ".
				"WHERE     u.display_name NOT IN ({$exclude_users_s}) ".
				"ORDER BY  balance DESC ".
				"LIMIT     10"
			);

			$avatarsize=40;

			if (isset($p["avatarsize"]))
				$avatarsize=$p["avatarsize"];

			foreach ($items as &$item) {
				if (isset($p["authorlink"]))
					$item->url=get_author_posts_url($item->ID);

				if (isset($p["ucfirst"]))
					$item->name=ucfirst($item->name);

				$item->avatar=get_avatar($item->ID,$avatarsize);
			}

			$template=new Template(__DIR__."/../template/netpoker_ply_toplist.php");
			$template->set("items",$items);

			return $template->render();
		}
	}