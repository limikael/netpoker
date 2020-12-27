<div class="wrap">
    <h2>NetPoker Settings</h2>

    <form method="post" action="options.php">
        <?php settings_fields( 'netpoker' ); ?>
        <?php do_settings_sections( 'netpoker' ); ?>
        <table class="form-table">
            <tr valign="top">
                <th scope="row">Server Base URL</th>
                <td>
                    <input type="text" name="netpoker_serverurl" 
                        value="<?php echo esc_attr(get_option("netpoker_serverurl")); ?>"
                        class="regular-text"/>
                    <p class="description">Where is the server?</p>
                </td>
            </tr>
        </table>

        <?php submit_button(); ?>
    </form>
</div>