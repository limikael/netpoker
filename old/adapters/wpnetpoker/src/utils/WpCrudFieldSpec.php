<?php

	namespace wpnetpoker;

	class WpCrudFieldSpec {

		public $field;
		public $label;
		public $type;
		public $options;

		public function __construct($field) {
			$this->field=$field;
			$this->label=$field;
			$this->type="text";
		}

		public function label($label) {
			$this->label=$label;

			return $this;
		}

		public function type($type) {
			$this->type=$type;

			return $this;
		}

		public function options($options) {
			$this->options=$options;
			$this->type="select";

			return $this;
		}
	}