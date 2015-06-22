<table class="netpoker_cashgame_list">
	<tr>
		<th>Table</th>
		<th>Players</th>
		<th>Blinds</th>
		<th>Sit In</th>
	</tr>

	<?php foreach ($items as $item) { ?>
		<tr>
			<td>
				<a href="<?php echo plugins_url(); ?>/wpnetpoker/game.php">
					<?php print $item->title; ?>
				</a>
			</td>
			<td>
				<?php print $item->currentNumPlayers; ?> /
				<?php print $item->numseats; ?>
			</td>
			<td>
				<?php print $item->stake/2; ?> /
				<?php print $item->stake; ?>
				<?php print $item->currency; ?>
			</td>
			<td>
				<?php print $item->minSitIn; ?> - 
				<?php print $item->maxSitIn; ?>
				<?php print $item->currency; ?>
			</td>
		</tr>
	<?php } ?>

</table>