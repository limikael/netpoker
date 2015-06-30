<table cellspacing="2" cellpadding="5" style="width: 100%;" class="form-table">
	<tbody>
		<?php foreach ($fields as $field) { ?>
			<tr class="form-field">
				<th valign="top" scope="row">
					<label for="<?php echo $field["field"]; ?>"><?php echo $field["label"]; ?></label>
				</th>
				<td>
					<?php if ($field["spec"]->type=="select") { ?>
						<select id="<?php echo $field["field"] ?>"
								name="<?php echo $field["field"] ?>">
							<?php foreach ($field["spec"]->options as $key=>$value) { ?>
								<option value="<?php echo $key; ?>"
									<?php if ($field["value"]==$key) { ?>
										selected="true"
									<?php } ?>
								>
									<?php echo $value; ?>
								</option>
							<?php } ?>
						</select>
					<?php } else if ($field["spec"]->type=="timestamp") { ?>
						<input id="<?php echo $field["field"] ?>" 
								name="<?php echo $field["field"] ?>" 
								type="text" 
								style="width: 95%" 
								value="<?php echo esc_attr($field['value'])?>"
								size="50" class="code" placeholder="">
						<script>
							jQuery(document).ready(function() {
							    jQuery('#<?php echo $field["field"] ?>').datepicker({
							        dateFormat : 'yy-mm-dd'
							    });
							});
						</script>
					<?php } else { ?>
						<input id="<?php echo $field["field"] ?>" 
								name="<?php echo $field["field"] ?>" 
								type="text" 
								style="width: 95%" 
								value="<?php echo esc_attr($field['value'])?>"
								size="50" class="code" placeholder="">
					<?php } ?>
				</td>
			</tr>
		<?php } ?>
	</tbody>
</table>