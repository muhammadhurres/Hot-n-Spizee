package app.hotnspizee.com;

import android.content.Context;
import android.content.pm.PackageInfo;
import android.content.pm.PackageInstaller;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.regex.Pattern;

public final class UpdateCheckWorker extends Worker {
    private static final String TAG = "HotNSpizeeUpdater";
    private static final String METADATA_URL =
            "https://github.com/muhammadhurres/Hot-n-Spizee/releases/latest/download/update.json";
    private static final String APK_URL =
            "https://github.com/muhammadhurres/Hot-n-Spizee/releases/latest/download/hotnspizee.apk";
    private static final long MAX_APK_SIZE = 100L * 1024L * 1024L;
    private static final Pattern SHA256_PATTERN = Pattern.compile("^[a-fA-F0-9]{64}$");
    private static final Object UPDATE_LOCK = new Object();

    public UpdateCheckWorker(@NonNull Context context, @NonNull WorkerParameters parameters) {
        super(context, parameters);
    }

    @NonNull
    @Override
    public Result doWork() {
        synchronized (UPDATE_LOCK) {
            return checkAndInstallUpdate();
        }
    }

    @NonNull
    private Result checkAndInstallUpdate() {
        try {
            JSONObject metadata = new JSONObject(readText(METADATA_URL, 32768));
            if (!"app.hotnspizee.com".equals(metadata.optString("packageName"))
                    || !APK_URL.equals(metadata.optString("apkUrl"))) {
                Log.e(TAG, "Update metadata did not match the official app package and APK URL.");
                return Result.failure();
            }

            String expectedHash = metadata.optString("sha256").toLowerCase(Locale.ROOT);
            long offeredVersion = metadata.optLong("versionCode", -1);
            if (!SHA256_PATTERN.matcher(expectedHash).matches() || offeredVersion < 1) {
                Log.e(TAG, "Update metadata contained an invalid version or checksum.");
                return Result.failure();
            }

            PackageManager packageManager = getApplicationContext().getPackageManager();
            PackageInfo installed = packageManager.getPackageInfo(
                    getApplicationContext().getPackageName(), 0);
            if (offeredVersion <= versionCode(installed)) return Result.success();

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                    && !packageManager.canRequestPackageInstalls()) {
                getApplicationContext().getSharedPreferences("app_updates", Context.MODE_PRIVATE)
                        .edit()
                        .putLong("pending_permission_version", offeredVersion)
                        .apply();
                return Result.success();
            }

            File apk = new File(getApplicationContext().getCacheDir(), "hotnspizee-update.apk");
            downloadApk(apk);
            if (!expectedHash.equals(sha256(apk))) {
                apk.delete();
                Log.e(TAG, "Downloaded APK checksum did not match the published checksum.");
                return Result.failure();
            }

            PackageInfo candidate = packageInfoFromApk(packageManager, apk);
            if (candidate == null
                    || !getApplicationContext().getPackageName().equals(candidate.packageName)
                    || versionCode(candidate) != offeredVersion) {
                apk.delete();
                Log.e(TAG, "Downloaded APK package or version did not match update metadata.");
                return Result.failure();
            }

            install(apk);
            return Result.success();
        } catch (IOException error) {
            Log.w(TAG, "Update check could not reach the release server.", error);
            return Result.retry();
        } catch (Exception error) {
            Log.e(TAG, "Update check failed.", error);
            return Result.failure();
        }
    }

    private String readText(String address, int maxBytes) throws IOException {
        HttpURLConnection connection = openConnection(address);
        try {
            int status = connection.getResponseCode();
            if (status < 200 || status >= 300) {
                throw new IOException("Update metadata request returned HTTP " + status);
            }
            try (InputStream input = new BufferedInputStream(connection.getInputStream());
                 ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                byte[] buffer = new byte[4096];
                int count;
                while ((count = input.read(buffer)) != -1) {
                    if (output.size() + count > maxBytes) {
                        throw new IOException("Update metadata exceeded its size limit.");
                    }
                    output.write(buffer, 0, count);
                }
                return output.toString("UTF-8");
            }
        } finally {
            connection.disconnect();
        }
    }

    private void downloadApk(File destination) throws IOException {
        HttpURLConnection connection = openConnection(APK_URL);
        try {
            int status = connection.getResponseCode();
            if (status < 200 || status >= 300) {
                throw new IOException("APK download returned HTTP " + status);
            }
            long contentLength = connection.getContentLengthLong();
            if (contentLength > MAX_APK_SIZE) {
                throw new IOException("APK exceeded the maximum allowed download size.");
            }
            try (InputStream input = new BufferedInputStream(connection.getInputStream());
                 OutputStream output = new FileOutputStream(destination)) {
                byte[] buffer = new byte[16384];
                long total = 0;
                int count;
                while ((count = input.read(buffer)) != -1) {
                    total += count;
                    if (total > MAX_APK_SIZE) {
                        throw new IOException("APK exceeded the maximum allowed download size.");
                    }
                    output.write(buffer, 0, count);
                }
            }
        } finally {
            connection.disconnect();
        }
    }

    private HttpURLConnection openConnection(String address) throws IOException {
        HttpURLConnection connection = (HttpURLConnection) new URL(address).openConnection();
        connection.setConnectTimeout(15000);
        connection.setReadTimeout(30000);
        connection.setRequestProperty("User-Agent", "Hot-n-Spizee-Android-Updater");
        connection.setInstanceFollowRedirects(true);
        return connection;
    }

    private String sha256(File file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream input = new FileInputStream(file)) {
            byte[] buffer = new byte[16384];
            int count;
            while ((count = input.read(buffer)) != -1) digest.update(buffer, 0, count);
        }
        StringBuilder result = new StringBuilder();
        for (byte value : digest.digest()) result.append(String.format(Locale.ROOT, "%02x", value & 0xff));
        return result.toString();
    }

    private PackageInfo packageInfoFromApk(PackageManager packageManager, File apk) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return packageManager.getPackageArchiveInfo(
                    apk.getAbsolutePath(), PackageManager.PackageInfoFlags.of(0));
        }
        return packageManager.getPackageArchiveInfo(apk.getAbsolutePath(), 0);
    }

    private long versionCode(PackageInfo info) {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                ? info.getLongVersionCode()
                : info.versionCode;
    }

    private void install(File apk) throws IOException {
        PackageInstaller installer = getApplicationContext().getPackageManager().getPackageInstaller();
        PackageInstaller.SessionParams parameters =
                new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
        parameters.setAppPackageName(getApplicationContext().getPackageName());
        parameters.setSize(apk.length());
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            parameters.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED);
        }

        int sessionId = installer.createSession(parameters);
        try (PackageInstaller.Session session = installer.openSession(sessionId);
             InputStream input = new FileInputStream(apk);
             OutputStream output = session.openWrite("hotnspizee.apk", 0, apk.length())) {
            byte[] buffer = new byte[16384];
            int count;
            while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
            session.fsync(output);
            Uri callbackUri = new Uri.Builder().scheme("hotnspizee-update")
                    .authority(Integer.toString(sessionId)).build();
            android.content.Intent callback = new android.content.Intent(
                    getApplicationContext(), UpdateInstallReceiver.class);
            callback.setData(callbackUri);
            int flags = android.app.PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                flags |= android.app.PendingIntent.FLAG_MUTABLE;
            }
            android.app.PendingIntent pendingIntent = android.app.PendingIntent.getBroadcast(
                    getApplicationContext(), sessionId, callback, flags);
            session.commit(pendingIntent.getIntentSender());
        } catch (Exception error) {
            installer.abandonSession(sessionId);
            throw new IOException("Could not stage the verified APK update.", error);
        } finally {
            if (!apk.delete()) Log.w(TAG, "Could not remove the temporary update APK.");
        }
    }
}
