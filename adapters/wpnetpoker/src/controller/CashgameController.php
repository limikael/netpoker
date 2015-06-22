<?php

	require_once __DIR__."/../utils/Template.php";

	/**
	 * Handle shortcodes related to cashgames.
	 */
	class CashgameController {

		private static $instance;

		/**
		 * Construct.
		 */
		public function __construct() {
			$this->setupShortcodes();

			wp_register_style('netpoker', plugins_url()."/wpnetpoker/res/wpnetpoker.css");
		}

		/**
		 * Setup shortcodes.
		 */
		public function setupShortcodes() {
			add_shortcode("netpoker_cashgame_list", array($this, "netpoker_cashgame_list"));
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
		 * Init.
		 */
		public static function init() {
			if (self::$instance)
				throw new Exception("Already created");

			self::$instance=new CashgameController();
		}
	}