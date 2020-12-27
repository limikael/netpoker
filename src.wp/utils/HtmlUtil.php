<?php

namespace netpoker;

class HtmlUtil {
	static function renderSelectOptions($options, $current=NULL) {
		$res="";

		foreach ( $options as $key => $label ) {
			$res.=sprintf(
				'<option value="%s" %s>%s</option>',
				esc_attr( $key ),
				( ( strval( $current ) === strval( $key ) ) ? 'selected' : '' ),
				esc_html( $label )
			);
		}

		return $res;
	}

	static function displaySelectOptions($options, $current=NULL) {
		echo HtmlUtil::renderSelectOptions($options,$current);
	}
}
