<?php

	require_once __DIR__."/src/utils/WpUtil.php";
	require_once __DIR__."/src/controller/AjaxController.php";

	use wpnetpoker\WpUtil;
	use wpnetpoker\AjaxController;

	require_once WpUtil::getWpLoadPath();

	AjaxController::init()->dispatch();
