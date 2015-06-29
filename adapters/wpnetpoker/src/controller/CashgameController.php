<?php

	namespace wpnetpoker;

	require_once __DIR__."/../model/Cashgame.php";
	require_once __DIR__."/../utils/Template.php";
	require_once __DIR__."/../utils/WpCrud.php";
	require_once __DIR__."/../plugin/NetPokerPlugin.php";

	class CashgameController extends WpCrud {

		public function __construct() {
			parent::__construct();

			$currencies=array();
			$currencies["ply"]="PLY";

			if (is_plugin_active("wpblockchainaccounts/wpblockchainaccounts.php"))
				$currencies["bits"]="BITS";

			$numseatOptions=array(
				"2"=>"2",
				"3"=>"3",
				"4"=>"4",
				"6"=>"6",
				"8"=>"8",
				"10"=>"10"
			);

			$this->setTypeName("Cashgame");

			$this->addField("title")->label("Title");
			$this->addField("numseats")->label("Number of seats")->options($numseatOptions);
			$this->addField("currency")->label("Currency")->options($currencies);
			$this->addField("minSitInAmount")->label("Min sit in");
			$this->addField("maxSitInAmount")->label("Max sit in");
			$this->addField("stake")->label("Stake (Big Blind)");

			$this->setListFields(array("title","currency"));

			$this->setSubmenuSlug("netpoker_settings");
		}

		protected function createItem() {
			return new Cashgame();
		}

		protected function getFieldValue($item, $field) {
			return $item->$field;
		}

		protected function setFieldValue($item, $field, $value) {
			$item->$field=$value;
		}

		protected function saveItem($item) {
			$item->save();
			NetPokerPlugin::init()->reloadTablesConditionally();
		}

		protected function validateItem($item) {
			if (!$item->title)
				return "You need to name the table something.";

			if (!$item->numseats)
				return "Number of seats needs to be specified.";
		}

		protected function deleteItem($item) {
			$item->delete();
			NetPokerPlugin::init()->reloadTablesConditionally();
		}

		protected function getItem($id) {
			return Cashgame::findOne($id);
		}

		protected function getAllItems() {
			return Cashgame::findAll();
		}
	}