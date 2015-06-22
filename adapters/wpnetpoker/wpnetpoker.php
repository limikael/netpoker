<?php

/*
Plugin Name: Netpoker
Plugin URI: http://github.com/limikael/netpoker
Version: 0.0.1
*/

require_once __DIR__."/src/admin/CashgameListTable.php";
require_once __DIR__."/src/model/Cashgame.php";
require_once __DIR__."/src/plugin/NetPokerPlugin.php";
require_once __DIR__."/src/utils/ActiveRecord.php";

global $wpdb;

ActiveRecord::setTablePrefix($wpdb->prefix);
ActiveRecord::setPdo(new PDO("mysql:host=".DB_HOST.";dbname=".DB_NAME,DB_USER,DB_PASSWORD));

register_activation_hook(__FILE__,array("NetPokerPlugin","activate"));

