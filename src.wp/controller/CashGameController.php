<?php

namespace netpoker;

require_once __DIR__."/../utils/Template.php";
//require_once __DIR__."/../model/Thing.php";

class CashGameController extends Singleton {
	protected function __construct() {
		add_action("init",array($this,"init"));
		add_filter('the_content',array($this,"the_content"),10,1);
		add_filter("template_include",array($this,"template_include"),10,1);
		add_action("pre_get_posts",array($this,"pre_get_posts"));
	}

	public function init() {
		register_post_type("cashgame",array(
			'labels'=>array(
				'name'=>__( 'Cashgames' ),
				'singular_name'=>__( 'Cashgame' ),
				'not_found'=>__('No Cashgames.'),
				'add_new_item'=>__('Add New Cashgame'),
				'edit_item'=>__('Edit Cashgame')
			),
			'supports'=>array('title'),
			'public'=>true,
			"menu_icon"=>"dashicons-editor-kitchensink"
		));
	}

	public function pre_get_posts($query) {
		if ($query->is_singular() && 
				$query->is_main_query() && 
				$query->query["post_type"]=="cashgame")
			$query->is_page=TRUE;
	}

 	public function the_content($content) {
		if (is_singular("cashgame") && in_the_loop() && is_main_query()) {
			wp_enqueue_script("pixi",
				NETPOKER_URL."/res/pixi.min.js",
				array(),"5.3.6",true);

			wp_enqueue_script("netpokerclient-bundle",
				NETPOKER_URL."/res/netpokerclient-bundle.js",
				array("jquery","pixi"),"1.0.0",true);

			wp_enqueue_script("netpoker",
				NETPOKER_URL."/res/netpoker.js",
				array("netpokerclient-bundle"),"1.0.0",true);

			$config=array(
				"resourceBaseUrl"=>NETPOKER_URL."/res/"
			);

			wp_localize_script("netpoker","netpokerConfig",$config);

			$t=new Template(__DIR__."/../tpl/netpoker.tpl.php");
			return $t->render();
		}

 		return $content;
 	}

 	public function template_include($template) {
		if (is_singular("cashgame") && is_main_query()) {
			global $post;

			if ($post->post_type=="cashgame") {
				$t=locate_template(array(
					"cashgame.php",
					"page.php"
				));

				return $t;
			}
		}

 		return $template;
 	}
}