package com.partnerplay.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

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

        // Trigger immediate widget refresh
        PartnerWidgetProvider.triggerRefreshAll(context);

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
            ComponentName myProvider = new ComponentName(context, PartnerWidgetProvider.class);

            if (appWidgetManager != null && appWidgetManager.isRequestPinAppWidgetSupported()) {
                Intent pinnedSuccessIntent = new Intent(context, PartnerWidgetProvider.class);
                pinnedSuccessIntent.setAction(PartnerWidgetProvider.ACTION_MANUAL_REFRESH);

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

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }
}
