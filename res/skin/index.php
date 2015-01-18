<?php

	require_once __DIR__."/../../node_modules/resource-fiddle/bin/php/ResourceFiddle.php";

	$r=new ResourceFiddle();
	$r->load(__DIR__."/skin.xml");

	foreach (glob("viewcases/*.json") as $viewcase) {
		$label=str_replace("viewcases/","",str_replace(".json","",$viewcase));
		$r->addTestcase($label,"table.html?viewcase=".urlencode($viewcase));
	}

	$r->dispatch();