<table class="netpoker_cashgame_list tablesorter" cellpadding="0" cellspacing="0">
	<thead>
	<tr>
		<th>Table</th>
		<th>Players</th>
		<th>Blinds</th>
		<th>Sit In</th>
	</tr>
	</thead>
	<tbody>
	<?php foreach ($items as $item) { ?>
		<tr>
			<td>
				<a href="<?php echo plugins_url(); ?>/wpnetpoker/game.php?cashgameId=<?php echo $item->id; ?>"
					target="cashgame-<?php echo $item->id ?>-<?php echo wp_get_current_user()->ID ?>">
					<?php print $item->title; ?>
				</a>
			</td>
			<td>
				<span class="netpoker-current-players" cashgame-id="<?php echo $item->id; ?>">
					<?php print $item->currentNumPlayers; ?>
				</span>
				/
				<?php print $item->numseats; ?>
			</td>
			<td>
				<?php print $item->stake/2; ?> /
				<?php print $item->stake; ?>
				<?php print $item->currency; ?>
			</td>
			<td>
				<?php print $item->minSitInAmount; ?> - 
				<?php print $item->maxSitInAmount; ?>
				<?php print $item->currency; ?>
			</td>
		</tr>
	<?php } ?>
	</tbody>
</table>