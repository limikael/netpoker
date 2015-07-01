<?php

	namespace wpnetpoker;

	require_once __DIR__."/../utils/Template.php";
	require_once __DIR__."/../utils/Singleton.php";
	require_once __DIR__."/../plugin/NetPokerPlugin.php";
	require_once __DIR__."/../model/Cashgame.php";
	require_once __DIR__."/../model/Tournament.php";

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
	}