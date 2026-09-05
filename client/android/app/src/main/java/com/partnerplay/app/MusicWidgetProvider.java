package com.partnerplay.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.widget.RemoteViews;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MusicWidgetProvider extends AppWidgetProvider {

    private static final String TAG = "MusicWidgetProvider";
    public static final String ACTION_REFRESH_MUSIC_WIDGET = "com.partnerplay.app.ACTION_REFRESH_MUSIC_WIDGET";
    public static final String ACTION_TOGGLE_MUSIC_WIDGET = "com.partnerplay.app.ACTION_TOGGLE_MUSIC_WIDGET";

    private static final ExecutorService executor = Executors.newSingleThreadExecutor();
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
        String action = intent.getAction();

        if (ACTION_REFRESH_MUSIC_WIDGET.equals(action)) {
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
            ComponentName thisWidget = new ComponentName(context, MusicWidgetProvider.class);
            int[] appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);
            for (int id : appWidgetIds) {
                updateAppWidget(context, appWidgetManager, id);
            }
        } else if (ACTION_TOGGLE_MUSIC_WIDGET.equals(action)) {
            togglePlayback(context);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PartnerWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE);
        String roomCode = prefs.getString(PartnerWidgetProvider.KEY_ROOM_CODE, "LOVE99");
        String serverUrl = prefs.getString(PartnerWidgetProvider.KEY_SERVER_URL, "https://love.getfuckingclients.com");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_partner_music);
        views.setTextViewText(R.id.music_widget_room_code, "🎵 Studio " + roomCode);

        // Studio launch intent on header / studio button
        Intent studioIntent = new Intent(context, MainActivity.class);
        studioIntent.setAction(Intent.ACTION_VIEW);
        studioIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        studioIntent.putExtra("room", roomCode);

        PendingIntent studioPending = PendingIntent.getActivity(
                context,
                appWidgetId * 10 + 1,
                studioIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.music_widget_studio_btn, studioPending);
        views.setOnClickPendingIntent(R.id.music_widget_root, studioPending);

        // 1-Tap Toggle Play / Pause intent
        Intent toggleIntent = new Intent(context, MusicWidgetProvider.class);
        toggleIntent.setAction(ACTION_TOGGLE_MUSIC_WIDGET);
        PendingIntent togglePending = PendingIntent.getBroadcast(
                context,
                appWidgetId * 10 + 2,
                toggleIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.music_widget_toggle_btn, togglePending);

        try {
            appWidgetManager.updateAppWidget(appWidgetId, views);
        } catch (Exception e) {
            Log.e(TAG, "Initial music widget update error", e);
        }

        // Fetch live track state from cloud server in background
        executor.execute(() -> {
            try {
                String cleanBase = serverUrl.endsWith("/") ? serverUrl.substring(0, serverUrl.length() - 1) : serverUrl;
                String endpoint = cleanBase + "/api/room/" + roomCode + "/music?ts=" + System.currentTimeMillis();

                URL url = new URL(endpoint);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setConnectTimeout(6000);
                conn.setReadTimeout(6000);
                conn.setRequestMethod("GET");
                conn.connect();

                if (conn.getResponseCode() == HttpURLConnection.HTTP_OK) {
                    BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null) {
                        sb.append(line);
                    }
                    reader.close();

                    JSONObject json = new JSONObject(sb.toString());
                    boolean isPlaying = json.optBoolean("isPlaying", false);
                    JSONObject track = json.optJSONObject("currentTrack");
                    String title = track != null ? track.optString("title", "Midnight Lo-Fi") : "Midnight Lo-Fi";
                    String artist = track != null ? track.optString("artist", "Couple Beats") : "Couple Beats";

                    mainHandler.post(() -> {
                        try {
                            RemoteViews updateViews = new RemoteViews(context.getPackageName(), R.layout.widget_partner_music);
                            updateViews.setTextViewText(R.id.music_widget_room_code, "🎵 Studio " + roomCode);
                            updateViews.setTextViewText(R.id.music_widget_track_title, title);
                            updateViews.setTextViewText(R.id.music_widget_track_artist, artist + (isPlaying ? " • Playing with Partner" : " • Tap to listen"));
                            updateViews.setTextViewText(R.id.music_widget_sync_badge, isPlaying ? "💚 Live with Partner" : "🤍 Ready");
                            updateViews.setTextViewText(R.id.music_widget_toggle_btn, isPlaying ? "⏸️ Pause" : "▶️ Play Together");

                            updateViews.setOnClickPendingIntent(R.id.music_widget_studio_btn, studioPending);
                            updateViews.setOnClickPendingIntent(R.id.music_widget_root, studioPending);
                            updateViews.setOnClickPendingIntent(R.id.music_widget_toggle_btn, togglePending);

                            appWidgetManager.updateAppWidget(appWidgetId, updateViews);
                        } catch (Exception err) {
                            Log.e(TAG, "Error updating music remote views", err);
                        }
                    });
                }
                conn.disconnect();
            } catch (Exception e) {
                Log.e(TAG, "Error fetching music widget state", e);
            }
        });
    }

    private static void togglePlayback(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PartnerWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE);
        String roomCode = prefs.getString(PartnerWidgetProvider.KEY_ROOM_CODE, "LOVE99");
        String serverUrl = prefs.getString(PartnerWidgetProvider.KEY_SERVER_URL, "https://love.getfuckingclients.com");

        executor.execute(() -> {
            try {
                String cleanBase = serverUrl.endsWith("/") ? serverUrl.substring(0, serverUrl.length() - 1) : serverUrl;
                String endpoint = cleanBase + "/api/room/" + roomCode + "/music/toggle";

                URL url = new URL(endpoint);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setConnectTimeout(6000);
                conn.setReadTimeout(6000);
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setDoOutput(true);

                OutputStream os = conn.getOutputStream();
                os.write("{}".getBytes());
                os.flush();
                os.close();

                int code = conn.getResponseCode();
                conn.disconnect();

                if (code == HttpURLConnection.HTTP_OK) {
                    triggerRefreshAll(context);
                }
            } catch (Exception e) {
                Log.e(TAG, "Error toggling playback from widget", e);
            }
        });
    }

    public static void triggerRefreshAll(Context context) {
        Intent refreshIntent = new Intent(context, MusicWidgetProvider.class);
        refreshIntent.setAction(ACTION_REFRESH_MUSIC_WIDGET);
        context.sendBroadcast(refreshIntent);
    }
}
