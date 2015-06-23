<?php

	require_once __DIR__."/src/utils/WpUtil.php";
	require_once __DIR__."/src/utils/ActiveRecord.php";
	require_once __DIR__."/src/controller/ApiController.php";

	require_once WpUtil::getWpLoadPath();

	global $wpdb;

	ActiveRecord::setTablePrefix($wpdb->prefix);
	ActiveRecord::setPdo(WpUtil::getCompatiblePdo());

	ApiController::init()->dispatch();
