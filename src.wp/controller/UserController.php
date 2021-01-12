<?php

namespace netpoker;

require_once __DIR__."/../utils/Template.php";

class UserController extends Singleton {
	protected function __construct() {
		add_action("cmb2_admin_init",array($this,"cmb2_admin_init"));
	}

	public function cmb2_admin_init() {
		$cmb=new_cmb2_box(array(
			"id"=>"netpoker_user_settings",
			"title"=>"Poker Account",
			"object_types"=>array("user"),
			"show_names"=>TRUE
		));

		$cmb->add_field(array(
			"name"=>"Playmoney Balance",
			"id"=>"netpoker_ply_balance",
			"type"=>"text_small",
			"description"=>"Playmoney balance for this user",
		));
	}
}