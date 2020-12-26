<div class="wrap">
	<div class="icon32 icon32-posts-post" id="icon-edit"><br></div>
	<h2>
		<?php echo $title; ?>
		<a class="add-new-h2" href="<?php echo $backlink ;?>">Back to list</a>
	</h2>

	<?php if (!empty($notice)): ?>
		<div id="notice" class="error"><p><?php echo $notice ?></p></div>
	<?php endif;?>

	<?php if (!empty($message)): ?>
		<div id="message" class="updated"><p><?php echo $message ?></p></div>
	<?php endif;?>

	<form id="form" method="POST">
		<input type="hidden" name="nonce" value="<?php echo $nonce; ?>"/>
		<?php /* NOTICE: here we storing id to determine will be item added or updated */ ?>
		<input type="hidden" name="id" value="<?php echo $item->id ?>"/>

		<div class="metabox-holder" id="poststuff">
			<div id="post-body">
				<div id="post-body-content">
					<?php /* And here we call our custom meta box */ ?>
					<?php do_meta_boxes($metabox, $metaboxContext, $item); ?>
					<input type="submit" value="Save" id="submit" class="button-primary" name="submit">
				</div>
			</div>
		</div>
	</form>
</div>