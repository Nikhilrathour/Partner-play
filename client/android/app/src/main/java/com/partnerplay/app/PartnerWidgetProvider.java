package com.partnerplay.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.widget.RemoteViews;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class PartnerWidgetProvider extends AppWidgetProvider {

    private static final String TAG = "PartnerWidget";
    public static final String PREFS_NAME = "PartnerPlayWidgetPrefs";
    public static final String KEY_ROOM_CODE = "widget_room_code";
    public static final String KEY_SERVER_URL = "widget_server_url";
    public static final String ACTION_MANUAL_REFRESH = "com.partnerplay.app.ACTION_REFRESH_WIDGET";

    private static final ExecutorService networkExecutor = Executors.newSingleThreadExecutor();
    private static final Handler mainHandler = new Handler(Looper.getMainLooper());

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (ACTION_MANUAL_REFRESH.equals(intent.getAction())) {
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
            ComponentName thisWidget = new ComponentName(context, PartnerWidgetProvider.class);
            int[] appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);
            for (int appWidgetId : appWidgetIds) {
                updateAppWidget(context, appWidgetManager, appWidgetId);
            }
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String roomCode = prefs.getString(KEY_ROOM_CODE, "LOVE99");
        String serverUrl = prefs.getString(KEY_SERVER_URL, "https://love.getfuckingclients.com");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_partner_play);
        views.setTextViewText(R.id.widget_room_code, "❤️ Studio " + roomCode);
        views.setTextViewText(R.id.widget_status_text, "Live Sync");

        // Intent to launch full studio app on widget tap
        Intent intent = new Intent(context, MainActivity.class);
        intent.setAction(Intent.ACTION_VIEW);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        intent.putExtra("room", roomCode);

        PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                appWidgetId,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);

        // Immediately update with initial layout so widget appears instantly without errors
        try {
            appWidgetManager.updateAppWidget(appWidgetId, views);
        } catch (Exception e) {
            Log.e(TAG, "Error performing initial widget update", e);
        }

        // Fetch widget drawing PNG in background thread
        networkExecutor.execute(() -> {
            Bitmap bitmap = null;
            try {
                String cleanBase = serverUrl.endsWith("/") ? serverUrl.substring(0, serverUrl.length() - 1) : serverUrl;
                String endpoint = cleanBase + "/api/room/" + roomCode + "/widget.png?ts=" + System.currentTimeMillis();
                
                URL url = new URL(endpoint);
                HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                connection.setConnectTimeout(6000);
                connection.setReadTimeout(6000);
                connection.setDoInput(true);
                connection.connect();

                if (connection.getResponseCode() == 200) {
                    InputStream input = connection.getInputStream();
                    bitmap = BitmapFactory.decodeStream(input);
                }
            } catch (Exception e) {
                Log.e(TAG, "Error fetching widget bitmap", e);
            }

            final Bitmap finalBitmap = bitmap;
            mainHandler.post(() -> {
                try {
                    RemoteViews updateViews = new RemoteViews(context.getPackageName(), R.layout.widget_partner_play);
                    updateViews.setTextViewText(R.id.widget_room_code, "❤️ Studio " + roomCode);
                    updateViews.setOnClickPendingIntent(R.id.widget_root, pendingIntent);

                    if (finalBitmap != null) {
                        updateViews.setImageViewBitmap(R.id.widget_canvas_image, finalBitmap);
                        updateViews.setTextViewText(R.id.widget_status_text, "Synced");
                    } else {
                        updateViews.setTextViewText(R.id.widget_status_text, "Tap to draw");
                    }
                    appWidgetManager.updateAppWidget(appWidgetId, updateViews);
                } catch (Exception err) {
                    Log.e(TAG, "Error updating remote views with bitmap", err);
                }
            });
        });
    }

    public static void triggerRefreshAll(Context context) {
        Intent refreshIntent = new Intent(context, PartnerWidgetProvider.class);
        refreshIntent.setAction(ACTION_MANUAL_REFRESH);
        context.sendBroadcast(refreshIntent);
    }
}
