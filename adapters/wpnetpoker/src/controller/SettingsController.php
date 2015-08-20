<?php

	namespace wpnetpoker;

	require_once __DIR__."/../utils/Template.php";
	require_once __DIR__."/../plugin/NetPokerPlugin.php";
	require_once __DIR__."/../utils/Singleton.php";

	/**
	 * Manage the settings page.
	 */
	class SettingsController extends Singleton {

		/**
		 * Construct.
		 */
		public function __construct() {
			$this->settings=array(array(
				"setting"=>"netpoker_gameplay_server_host",
				"title"=>"Gameplay server host",
				"description"=>
					"The host where clients will connect when playing the game. ".
					"If blank the same hostname as the wordpress site url will be used."
			), array(
				"setting"=>"netpoker_gameplay_server_to_server_host",
				"title"=>"Gameplay server to server host",
				"description"=>
					"The host used when the web server talks to the gameplay server. ".
					"If blank the Gameplay server host will be used."
			), array(
				"setting"=>"netpoker_gameplay_server_port",
				"title"=>"Gameplay server port",
				"description"=>
					"The port where the gameplay server is listening."
			), array(
				"setting"=>"netpoker_gameplay_key",
				"title"=>"Gameplay server key",
				"description"=>
					"This key is both sent and expected in all communication with the gameplay server."
			), array(
				"setting"=>"netpoker_communicate_with_server",
				"title"=>"Communicate with server",
				"type"=>"select",
				"options"=>array(
					0=>"No",
					1=>"Yes"
				),
				"description"=>
					"Should the gameplay server be notified about database changed, etc? ".
					"Requires that the gameplay is up and running."
			), array(
				"setting"=>"netpoker_gameplay_ssl",
				"title"=>"Gameplay ssl",
				"type"=>"select",
				"options"=>array(
					0=>"No",
					1=>"Yes"
				),
				"description"=>
					"Does the gameplay server use https for its communication?"
			));

			add_action('admin_menu',array($this,'admin_menu'));
		}

		/**
		 * Add options page
		 */
		public function admin_menu() {
			// This page will be under "Settings"
			add_menu_page(
				'NetPoker',
				'NetPoker',
				'manage_options', 
				'netpoker_settings',
				array($this,'create_settings_page')
			);

			add_action('admin_init',array($this,'admin_init'));			
		}		

		/**
		 * Admin init.
		 */
		public function admin_init() {
			foreach ($this->settings as $setting) {
				register_setting("netpoker",$setting["setting"]);
			}
		}

		/**
		 * Create the settings page.
		 */
		public function create_settings_page() {
			$template=new Template(__DIR__."/../template/settings.tpl.php");
			$template->set("settings",$this->settings);
			$template->set("startupCommand",
				"netpokerserver --config=".plugins_url("wpnetpoker/api.php")."/serverConfig?key=".get_option("netpoker_gameplay_key")
			);
			$template->show();
		}
	}