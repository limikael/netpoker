<form method="get" id="netpoker-viewcase-form">
	<select id="netpoker-viewcase-select" name="viewcase">
		<?php netpoker\HtmlUtil::displaySelectOptions($viewcaseOptions,$currentViewcase); ?>
	</select>
</form>