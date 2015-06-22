<div class="wrap">
    <h2>NetPoker Settings</h2>

    <form method="post" action="options.php">
        <?php settings_fields( 'netpoker' ); ?>
        <?php do_settings_sections( 'netpoker' ); ?>
        <table class="form-table">
            <?php foreach ($settings as $setting) { ?>
                <tr valign="top">
                    <th scope="row"><?php echo $setting["title"]; ?></th>
                    <td>
                        <input type="text" name="<?php echo $setting["setting"]; ?>" 
                            value="<?php echo esc_attr(get_option($setting["setting"])); ?>" 
                            class="regular-text"/>
                    </td>
                </tr>
            <?php } ?>
        </table>

        <?php submit_button(); ?>
    </form>
</div>