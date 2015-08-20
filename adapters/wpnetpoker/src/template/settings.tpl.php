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
                        <?php if ($setting["type"]=="select") { ?>
                            <select name="<?php echo esc_attr($setting["setting"]); ?>">
                                <?php foreach ($setting["options"] as $optionValue=>$optionText) { ?>
                                    <option value="<?php echo esc_attr($optionValue); ?>"
                                        <?php if (get_option($setting["setting"])==$optionValue) { ?>
                                            selected
                                        <?php } ?>
                                    >
                                        <?php echo $optionText; ?>
                                    </option>
                                <?php } ?>
                            </select>
                        <?php } else { ?>
                            <input type="text" name="<?php echo $setting["setting"]; ?>" 
                                value="<?php echo esc_attr(get_option($setting["setting"])); ?>" 
                                class="regular-text"/>
                        <?php } ?>
                        <?php if ($setting["description"]) { ?>
                            <p class="description"><?php echo $setting["description"]; ?></p>
                        <?php } ?>
                    </td>
                </tr>
            <?php } ?>
            <tr valign="top">
                <th scope="row">Server startup</th>
                <td>
                    <tt><?php echo $startupCommand; ?></tt>
                </td>
            </tr>
        </table>

        <?php submit_button(); ?>
    </form>
</div>