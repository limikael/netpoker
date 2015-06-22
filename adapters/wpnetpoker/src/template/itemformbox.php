<table cellspacing="2" cellpadding="5" style="width: 100%;" class="form-table">
	<tbody>
		<?php foreach ($fields as $field) { ?>
			<tr class="form-field">
				<th valign="top" scope="row">
					<label for="<?php echo $field["field"]; ?>"><?php echo $field["label"]; ?></label>
				</th>
				<td>
					<input id="<?php echo $field["field"] ?>" 
						name="<?php echo $field["field"] ?>" type="text" style="width: 95%" value="<?php echo esc_attr($field['value'])?>"
						size="50" class="code" placeholder="">
				</td>
			</tr>
		<?php } ?>
	</tbody>
</table>