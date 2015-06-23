<?php

	require_once __DIR__."/../model/Cashgame.php";
	require_once __DIR__."/../utils/Template.php";
	require_once __DIR__."/../utils/WpCrud.php";

	class CashgameListTable extends WpCrud {

		public function __construct() {
			parent::__construct();

			$this->setTypeName("Cashgame");

			$this->addField("title")->label("Title");
			$this->addField("numseats")->label("Number of seats");
			$this->addField("currency")->label("Currency");
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
		}

		protected function validateItem($item) {
			if (!$item->numseats)
				return "Number of seats needs to be specified";
		}

		protected function deleteItem($item) {
			$item->delete();
		}

		protected function getItem($id) {
			return Cashgame::findOne($id);
		}

		protected function getAllItems() {
			return Cashgame::findAll();
		}
	}