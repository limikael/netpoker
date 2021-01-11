<?php
/**
 * WP NetPoker
 *
 * Plugin Name:       NetPoker
 * Plugin URI:        https://github.com/limikael/netpoker
 * GitHub Plugin URI: https://github.com/limikael/netpoker
 * Description:       Poker System For WordPress.
 * Version:           1.1
 * Requires at least: 5.2
 * Requires PHP:      7.2
 * Author:            Mikael Lindqvist
 * Text Domain:       wp-netpoker
 * License:           GPL v2 or later
 * License URI:       http://www.gnu.org/licenses/gpl-2.0.txt
 */

defined( 'ABSPATH' ) || exit;

define('NETPOKER_URL',plugin_dir_url(__FILE__));
define('NETPOKER_PATH',plugin_dir_path(__FILE__));

require_once(__DIR__."/ext/CMB2/init.php");
require_once(__DIR__."/src.wp/plugin/NetPokerPlugin.php");

// Handle plugin activation.
function netpoker_activate() {
	netpoker\NetPokerPlugin::instance()->activate();
}
register_activation_hook( __FILE__, 'netpoker_activate' );

// Handle plugin uninstall.
function netpoker_uninstall() {
	netpoker\NetPokerPlugin::instance()->uninstall();
}
register_uninstall_hook( __FILE__, 'netpoker_uninstall' );

netpoker\NetPokerPlugin::instance();
