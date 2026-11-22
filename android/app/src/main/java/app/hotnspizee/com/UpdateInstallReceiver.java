package app.hotnspizee.com;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInstaller;
import android.os.Build;
import android.util.Log;

public final class UpdateInstallReceiver extends BroadcastReceiver {
    private static final String TAG = "HotNSpizeeUpdater";

    @Override
    public void onReceive(Context context, Intent intent) {
        int status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS,
                PackageInstaller.STATUS_FAILURE);
        if (status == PackageInstaller.STATUS_SUCCESS) {
            Log.i(TAG, "App update installed.");
            return;
        }

        if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) {
            Intent confirmation;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                confirmation = intent.getParcelableExtra(Intent.EXTRA_INTENT, Intent.class);
            } else {
                confirmation = intent.getParcelableExtra(Intent.EXTRA_INTENT);
            }
            if (confirmation != null) {
                confirmation.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                try {
                    context.startActivity(confirmation);
                } catch (RuntimeException error) {
                    Log.e(TAG, "Android requires a user-confirmed update.", error);
                }
            } else {
                Log.e(TAG, "Android requested install confirmation without a confirmation intent.");
            }
            return;
        }

        Log.e(TAG, "Android rejected the app update with installer status " + status
                + ": " + intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE));
    }
}
