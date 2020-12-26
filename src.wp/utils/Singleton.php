<?php

namespace netpoker;

/**
 * Ensures that an inheriting class is a Singleton, i.e.
 * there can only ever be one instance of the class.
 */
abstract class Singleton {

	private static $instances=array();

	/**
	 * Create or get the instance for the class.
	 */ 
	public static function instance() {
		if (!self::$instances)
			self::clearInstances();

		$class=get_called_class();

		if (!isset(self::$instances[$class]))
			self::$instances[$class]=new $class;

		return self::$instances[$class];
	}

	/**
	 * Clear instances.
	 */
	public static function clearInstances() {
		self::$instances=array();
	}
}
