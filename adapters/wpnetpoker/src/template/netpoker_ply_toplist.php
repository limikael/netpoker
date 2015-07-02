<table class="netpoker_ply_toplist" cellpadding="0" cellspacing="0">
	<thead>
		<tr>
			<th>Place</th>
			<th>User</th>
			<th>PLY</th>
		</tr>
	</thead>
	<tbody>
		<?php $i=1; ?>
		<?php foreach ($items as $item) { ?>
			<tr>
				<td><?php echo $i;?></td>
				<td><?php echo $item->name; ?></td>
				<td><?php echo $item->balance; ?></td>
			</tr>
			<?php $i++; ?>
		<?php } ?>
	</tbody>
</table>