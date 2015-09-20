<table class="netpoker_cashgame_list tablesorter" cellpadding="0" cellspacing="0">
<thead>
	<tr>
		<th>Tournament</th>
		<th>Starts</th>
		<th>Fee</th>
		<th>Prize</th>
		<th>Registrations</th>
	</tr>
</thead>
<tbody>
	<?php foreach ($items as $item) { ?>
		<tr>
			<td>
				<a href="<?php echo plugins_url(); ?>/wpnetpoker/game.php?tournamentId=<?php echo $item->id; ?>"
					target="tournament-<?php echo $item->id ?>-<?php echo wp_get_current_user()->ID ?>">
					<?php print $item->title; ?>
				</a>
			</td>
			<td>
				Sit'n'go
			</td>
			<td>
				<?php print $item->fee; ?> + 
				<?php print $item->commission; ?>
				<?php print $item->currency; ?>
			</td>
			<td>
				<?php print $item->getPrizePool(); ?>
				<?php print $item->currency; ?>
			</td>
			<td>
				<?php print $item->getNumRegistrations(); ?>
			</td>
		</tr>
	<?php } ?>
</tbody>
</table>