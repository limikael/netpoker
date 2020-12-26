<?php

namespace netpoker;

/**
 * Simple template renderer.
 */
class Template {

	/**
	 * Constructor.
	 */
	public function __construct($fileName) {
		$this->fileName=$fileName;
	}

	/**
	 * Render the template to a string.
	 */
	public function render($vars=array()) {
		foreach ($vars as $key=>$value)
			$$key=$value;

		ob_start();
		require $this->fileName;
		return ob_get_clean();
	}

	/**
	 * Display the rendered template.
	 */
	public function display($vars=array()) {
		foreach ($vars as $key=>$value)
			$$key=$value;

		require $this->fileName;
	}
}