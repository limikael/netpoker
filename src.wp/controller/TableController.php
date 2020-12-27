<?php

namespace netpoker;

require_once __DIR__."/../utils/HtmlUtil.php";

class TableController extends Singleton {
	protected function __construct() {
		add_shortcode("netpoker-viewcases",array($this,"netpoker_viewcases"));
	}

	public function netpoker_viewcases() {
		$currentViewcase=$_REQUEST["viewcase"];
		if (!$currentViewcase)
			$currentViewcase="basic";

		$viewcases=NetPokerPlugin::instance()->serverRequest("listViewCases");
		$viewcaseOptions=array();
		foreach ($viewcases as $viewcase)
			$viewcaseOptions[$viewcase]=$viewcase;

		$t=new Template(__DIR__."/../tpl/viewcase.tpl.php");
		$vars=array(
			"viewcaseOptions"=>$viewcaseOptions,
			"currentViewcase"=>$currentViewcase
		);

		$params=array(
			"viewcase"=>$currentViewcase
		);

		return ($t->render($vars).$this->renderTable($params));
	}

	public function renderTable($params=array()) {
		wp_enqueue_script("pixi",
			NETPOKER_URL."/res/pixi.min.js",
			array(),"5.3.6",true);

		wp_enqueue_script("netpokerclient-bundle",
			NETPOKER_URL."/res/netpokerclient-bundle.js",
			array("jquery","pixi"),"1.0.0",true);

		wp_enqueue_script("netpoker",
			NETPOKER_URL."/res/netpoker.js",
			array("netpokerclient-bundle"),"1.0.0",true);

		$config["resourceBaseUrl"]=NETPOKER_URL."/res/";

		$url=get_option("netpoker_serverurl");
		$url=str_replace("http://", "ws://", $url);
		$url=str_replace("https://", "wss://", $url);
		$config["serverUrl"]=$url."?".http_build_query($params);

		wp_localize_script("netpoker","netpokerConfig",$config);

		$t=new Template(__DIR__."/../tpl/netpoker.tpl.php");
		return $t->render();
	}
}