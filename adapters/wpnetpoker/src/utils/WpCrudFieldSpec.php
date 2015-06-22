<?php

	class WpCrudFieldSpec {

		public $field;
		public $label;

		public function __construct($field) {
			$this->field=$field;
			$this->label=$field;
		}

		public function label($label) {
			$this->label=$label;

			return $this;
		}
	}