<?php

namespace netpoker;

class CashGame {
	private $post;

	private function __construct($post) {
		if ($post->post_type!="cashgame")
			throw new \Exception("not a cashgame");

		$this->post=$post;
	}

	public function getId() {
		return $this->post->ID;
	}

	public function getName() {
		return $this->post->post_title;
	}

	public function getMeta($meta) {
		return get_post_meta($this->post->ID,$meta,TRUE);
	}

	public function setMeta($meta, $value) {
		update_post_meta($this->getId(),"numPlayers",$value);
	}

	public static function getCurrent() {
		global $post;

		if ($post->post_type=="cashgame")
			return new CashGame($post);
	}

	public static function findOneById($id) {
		$post=get_post($id);

		//error_log(print_r($post,TRUE));

		return new CashGame($post);
	}

	public static function findAllActive() {
		$posts=get_posts(array(
			"numberposts"=>-1,
			"post_type"=>"cashgame"
		));

		$res=array();
		foreach ($posts as $post)
			$res[]=new CashGame($post);

		return $res;
	}
}