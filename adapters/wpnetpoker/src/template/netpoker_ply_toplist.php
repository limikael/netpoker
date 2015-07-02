<table class="netpoker_ply_toplist">
	<tr>
		<th>Place</th>
		<th>User</th>
		<th>Ply</th>
	</tr>
	<?php $i=1; ?>
	<?php foreach ($items as $item) { ?>
		<tr>
			<td><?php echo $i;?>.</td>
			<td><?php echo $item->name;?></td>
			<td><?php echo $item->balance;?></td>
		</tr>
		<?php $i++; ?>
	<? } ?>
</table>