<?php

	namespace wpnetpoker;

	require_once __DIR__."/../model/Tournament.php";
	require_once __DIR__."/../utils/Template.php";
	require_once __DIR__."/../utils/WpCrud.php";
	require_once __DIR__."/../plugin/NetPokerPlugin.php";

	class TournamentController extends WpCrud {

		public function __construct() {
			parent::__construct("Tournament");

			$currencies=array();
			$currencies["ply"]="PLY";

			if (is_plugin_active("wpblockchainaccounts/wpblockchainaccounts.php"))
				$currencies["bits"]="BITS";

			$numseatOptions=array(
				"10"=>"10",
				"2"=>"2",
				"3"=>"3",
				"4"=>"4",
				"6"=>"6",
				"8"=>"8",
			);

			// use: https://github.com/xdan/datetimepicker

			$this->setTypeName("Tournament");

			$this->addField("title")->label("Title");
			$this->addField("info")->label("Info");
			$this->addField("currency")->label("Currency")->options($currencies);
			$this->addField("seatsPerTable")->label("Seats per table")->options($numseatOptions);
			$this->addField("fee")->label("Fee");
			$this->addField("commission")->label("Commission");
			$this->addField("bonus")->label("Bonus");
			$this->addField("levelDuration")->label("Level duration");
			$this->addField("blindLevels")->label("Blind levels");
			$this->addField("payoutPercent")->label("Payout percentages");
			$this->addField("minRegistrations")->label("Min. registrations");
			$this->addField("startTime")->label("Start time")->type("timestamp");

			$this->setListFields(array("title","currency","fee"));

			$this->setSubmenuSlug("netpoker_settings");
		}

		protected function createItem() {
			return new Tournament();
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
				return "There needs to be a title.";

			if (!$item->seatsPerTable)
				return "Number of seats needs to be specified.";

			if ($item->bonus+$item->fee+$item->commission==0)
				return "Bonus + Fee + Commission can't be 0, there needs to be a prize pool.";

			if (!$item->minRegistrations && !$item->startTime)
				return "There needs to be min registrations or start time.";
		}

		protected function deleteItem($item) {
			$item->delete();
			NetPokerPlugin::init()->reloadTablesConditionally();
		}

		protected function getItem($id) {
			return Tournament::findOne($id);
		}

		protected function getAllItems() {
			return Tournament::findAll();
		}
	}