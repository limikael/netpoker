<div class="wrap">
    <h2>NetPoker Settings</h2>

    <form method="post" action="options.php">
        <?php settings_fields( 'netpoker' ); ?>
        <?php do_settings_sections( 'netpoker' ); ?>
        <table class="form-table">
            <tr valign="top">
                <th scope="row">Backend URL</th>
                <td>
                    <input type="text" name="netpoker_serverurl" 
                        value="<?php echo esc_attr($backendUrl); ?>"
                        class="regular-text" readonly/>
                    <p class="description">This should be given to the server as --backend.</p>
                </td>
            </tr>

            <tr valign="top">
                <th scope="row">Gameplay Server URL</th>
                <td>
                    <input type="text" name="netpoker_serverurl" 
                        value="<?php echo esc_attr(get_option("netpoker_serverurl")); ?>"
                        class="regular-text"/>
                    <p class="description">Where is the gameplay server?</p>
                </td>
            </tr>
        </table>

        <?php submit_button(); ?>
    </form>
</div>