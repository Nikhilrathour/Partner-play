package com.partnerplay.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.Manifest;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.getcapacitor.PermissionState;

import com.google.firebase.messaging.FirebaseMessaging;

@CapacitorPlugin(name = "WidgetBridge", permissions = {
    @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = "notifications")
})
public class WidgetBridgePlugin extends Plugin {

    private static final int NOTIFICATION_PERMISSION_REQUEST = 1001;

    @PluginMethod
    public void saveWidgetRoomCode(PluginCall call) {
        String roomCode = call.getString("roomCode");
        String serverUrl = call.getString("serverUrl");

        if (roomCode == null || roomCode.trim().isEmpty()) {
            call.reject("roomCode is required");
            return;
        }

        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences(PartnerWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putString(PartnerWidgetProvider.KEY_ROOM_CODE, roomCode.trim().toUpperCase());
        if (serverUrl != null && !serverUrl.trim().isEmpty()) {
            editor.putString(PartnerWidgetProvider.KEY_SERVER_URL, serverUrl.trim());
        }
        editor.apply();

        // Trigger immediate widget refresh for both Canvas and Music widgets
        PartnerWidgetProvider.triggerRefreshAll(context);
        MusicWidgetProvider.triggerRefreshAll(context);

        JSObject ret = new JSObject();
        ret.put("success", true);
        ret.put("roomCode", roomCode);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPinWidget(PluginCall call) {
        Context context = getContext();
        String roomCode = call.getString("roomCode");
        String serverUrl = call.getString("serverUrl");
        String widgetType = call.getString("widgetType", "canvas");

        if (roomCode != null && !roomCode.trim().isEmpty()) {
            SharedPreferences prefs = context.getSharedPreferences(PartnerWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            editor.putString(PartnerWidgetProvider.KEY_ROOM_CODE, roomCode.trim().toUpperCase());
            if (serverUrl != null && !serverUrl.trim().isEmpty()) {
                editor.putString(PartnerWidgetProvider.KEY_SERVER_URL, serverUrl.trim());
            }
            editor.apply();
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AppWidgetManager appWidgetManager = context.getSystemService(AppWidgetManager.class);
            boolean isMusic = "music".equalsIgnoreCase(widgetType);
            ComponentName myProvider = isMusic 
                    ? new ComponentName(context, MusicWidgetProvider.class)
                    : new ComponentName(context, PartnerWidgetProvider.class);

            if (appWidgetManager != null && appWidgetManager.isRequestPinAppWidgetSupported()) {
                Intent pinnedSuccessIntent = isMusic
                        ? new Intent(context, MusicWidgetProvider.class)
                        : new Intent(context, PartnerWidgetProvider.class);

                pinnedSuccessIntent.setAction(isMusic 
                        ? MusicWidgetProvider.ACTION_REFRESH_MUSIC_WIDGET 
                        : PartnerWidgetProvider.ACTION_MANUAL_REFRESH);

                PendingIntent successCallback = PendingIntent.getBroadcast(
                        context,
                        0,
                        pinnedSuccessIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                );

                boolean success = appWidgetManager.requestPinAppWidget(myProvider, null, successCallback);

                JSObject ret = new JSObject();
                ret.put("supported", true);
                ret.put("requested", success);
                ret.put("widgetType", widgetType);
                call.resolve(ret);
                return;
            }
        }

        JSObject ret = new JSObject();
        ret.put("supported", false);
        ret.put("message", "Pinning not supported on this Android version. Add manually via home screen.");
        call.resolve(ret);
    }

    @PluginMethod
    public void refreshWidget(PluginCall call) {
        Context context = getContext();
        PartnerWidgetProvider.triggerRefreshAll(context);
        MusicWidgetProvider.triggerRefreshAll(context);

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    /**
     * Returns the FCM device token stored by FCMService.
     * Falls back to requesting a fresh token from FirebaseMessaging if not cached.
     */
    @PluginMethod
    public void getFCMToken(PluginCall call) {
        // First try reading the token saved by FCMService.onNewToken()
        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences(FCMService.PREFS_FCM, Context.MODE_PRIVATE);
        String cachedToken = prefs.getString(FCMService.KEY_FCM_TOKEN, null);

        if (cachedToken != null && !cachedToken.isEmpty()) {
            JSObject ret = new JSObject();
            ret.put("token", cachedToken);
            call.resolve(ret);
            return;
        }

        // If no cached token, request one from Firebase
        try {
            FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> {
                if (task.isSuccessful() && task.getResult() != null) {
                    String token = task.getResult();
                    // Cache it
                    prefs.edit().putString(FCMService.KEY_FCM_TOKEN, token).apply();

                    JSObject ret = new JSObject();
                    ret.put("token", token);
                    call.resolve(ret);
                } else {
                    JSObject ret = new JSObject();
                    ret.put("token", "");
                    ret.put("error", "Could not retrieve FCM token");
                    call.resolve(ret);
                }
            });
        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("token", "");
            ret.put("error", e.getMessage());
            call.resolve(ret);
        }
    }

    /**
     * Requests the POST_NOTIFICATIONS runtime permission on Android 13+.
     * On older versions, returns granted=true immediately.
     */
    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS)
                    == PackageManager.PERMISSION_GRANTED) {
                JSObject ret = new JSObject();
                ret.put("granted", true);
                call.resolve(ret);
            } else {
                // Use Capacitor's built-in permission system
                requestPermissionForAlias("notifications", call, "handleNotificationPermissionResult");
            }
        } else {
            // Pre-Android 13: no runtime permission needed
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
        }
    }

    @PermissionCallback
    private void handleNotificationPermissionResult(PluginCall call) {
        boolean granted = getPermissionState("notifications") == PermissionState.GRANTED;
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void startMusicForeground(PluginCall call) {
        String title = call.getString("title", "Our Playlist");
        String artist = call.getString("artist", "Partner Play");
        try {
            Context context = getContext();
            Intent intent = new Intent(context, MusicService.class);
            intent.setAction(MusicService.ACTION_PLAY);
            intent.putExtra("title", title);
            intent.putExtra("artist", artist);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to start music foreground service", e);
        }
    }

    @PluginMethod
    public void stopMusicForeground(PluginCall call) {
        try {
            Context context = getContext();
            Intent intent = new Intent(context, MusicService.class);
            intent.setAction(MusicService.ACTION_STOP);
            context.startService(intent);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to stop music foreground service", e);
        }
    }
}
