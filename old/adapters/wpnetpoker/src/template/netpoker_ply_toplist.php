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
				<td>
					<?php if (isset($item->url)) { ?>
						<a href="<?php echo $item->url; ?>">
							<?php echo $item->avatar; ?>
							<?php echo $item->name; ?>
						</a>
					<?php } else { ?>
						<?php echo $item->avatar; ?>
						<?php echo $item->name; ?>
					<?php } ?>
				</td>
				<td><?php echo $item->balance; ?></td>
			</tr>
			<?php $i++; ?>
		<?php } ?>
	</tbody>
</table>