package app.hotnspizee.com;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;

import androidx.appcompat.app.AlertDialog;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private boolean updatePermissionDialogVisible;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        UpdateScheduler.schedule(this);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                && getPackageManager().canRequestPackageInstalls()) {
            getSharedPreferences("app_updates", MODE_PRIVATE).edit()
                    .remove("pending_permission_version")
                    .apply();
            UpdateScheduler.checkNow(this);
            return;
        }

        long offeredVersion = getSharedPreferences("app_updates", MODE_PRIVATE)
                .getLong("pending_permission_version", 0);
        long promptedVersion = getSharedPreferences("app_updates", MODE_PRIVATE)
                .getLong("prompted_permission_version", 0);
        if (offeredVersion <= promptedVersion || updatePermissionDialogVisible) return;

        updatePermissionDialogVisible = true;
        new AlertDialog.Builder(this)
                .setTitle("Enable quiet app updates?")
                .setMessage("Allow Hot n Spizee to install its verified updates. This is a one-time Android setting and is separate from the permission used to install the first download.")
                .setNegativeButton("Not now", (dialog, which) -> {
                    rememberPromptedVersion(offeredVersion);
                    updatePermissionDialogVisible = false;
                })
                .setPositiveButton("Allow updates", (dialog, which) -> {
                    rememberPromptedVersion(offeredVersion);
                    Intent settings = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                            Uri.parse("package:" + getPackageName()));
                    startActivity(settings);
                    updatePermissionDialogVisible = false;
                })
                .setOnCancelListener(dialog -> updatePermissionDialogVisible = false)
                .show();
    }

    private void rememberPromptedVersion(long version) {
        getSharedPreferences("app_updates", MODE_PRIVATE).edit()
                .putLong("prompted_permission_version", version)
                .apply();
    }
}
