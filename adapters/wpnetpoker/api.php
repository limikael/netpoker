<?php

	require_once __DIR__."/src/utils/WpUtil.php";
	require_once __DIR__."/src/controller/ApiController.php";

	require_once WpUtil::getWpLoadPath();

	ApiController::init()->dispatch();
