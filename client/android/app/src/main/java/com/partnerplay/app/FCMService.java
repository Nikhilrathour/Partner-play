package com.partnerplay.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

public class FCMService extends FirebaseMessagingService {

    private static final String TAG = "FCMService";
    public static final String CHANNEL_ID = "partner_play_channel";
    public static final String PREFS_FCM = "PartnerPlayFCMPrefs";
    public static final String KEY_FCM_TOKEN = "fcm_device_token";

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel(this);
    }

    /**
     * Creates the notification channel required for Android 8.0+ (Oreo).
     * Public static so MainActivity can also ensure channel creation immediately on app launch.
     */
    public static void createNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && context != null) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Partner Notifications",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Notifications from your partner — music, drawings, and whisper notes");
            channel.enableVibration(true);
            channel.setShowBadge(true);

            NotificationManager notificationManager = context.getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }

    /**
     * Called when a new FCM token is generated (first launch, token refresh, etc.)
     * Saves the token to SharedPreferences so the Capacitor web layer can read it.
     */
    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        Log.d(TAG, "New FCM token generated: " + token);

        SharedPreferences prefs = getSharedPreferences(PREFS_FCM, Context.MODE_PRIVATE);
        prefs.edit().putString(KEY_FCM_TOKEN, token).apply();
    }

    /**
     * Called when a push notification is received from the server.
     * Shows a styled notification that opens the app when tapped.
     */
    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        Log.d(TAG, "FCM message received from: " + remoteMessage.getFrom());

        String title = "Nikhana Play ❤️";
        String body = "Your partner is active!";

        // Use notification payload if available
        if (remoteMessage.getNotification() != null) {
            title = remoteMessage.getNotification().getTitle() != null
                    ? remoteMessage.getNotification().getTitle()
                    : title;
            body = remoteMessage.getNotification().getBody() != null
                    ? remoteMessage.getNotification().getBody()
                    : body;
        }

        // Extract data payload for deep linking
        Map<String, String> data = remoteMessage.getData();
        if (data != null && !data.isEmpty()) {
            if (data.containsKey("title") && data.get("title") != null && !data.get("title").isEmpty()) {
                title = data.get("title");
            }
            if (data.containsKey("body") && data.get("body") != null && !data.get("body").isEmpty()) {
                body = data.get("body");
            }
        }

        String roomCode = (data != null && data.containsKey("roomCode")) ? data.get("roomCode") : "";
        String type = (data != null && data.containsKey("type")) ? data.get("type") : "general";

        int iconRes = R.drawable.ic_notification;

        // Build intent to open app with room and tab info
        Intent intent = new Intent(this, MainActivity.class);
        intent.setAction(Intent.ACTION_VIEW);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        intent.putExtra("room", roomCode);
        intent.putExtra("tab", getTabForType(type));

        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                (int) System.currentTimeMillis(),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Ensure channel exists before posting
        createNotificationChannel(this);

        // Build and show the notification
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(iconRes)
                .setContentTitle(title)
                .setContentText(body)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setColor(0xFFFF5722)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setDefaults(NotificationCompat.DEFAULT_SOUND | NotificationCompat.DEFAULT_VIBRATE);

        NotificationManager notificationManager =
                (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

        if (notificationManager != null) {
            int notificationId = type.hashCode();
            notificationManager.notify(notificationId, builder.build());
        }
    }

    /**
     * Maps notification type to the app tab to open.
     */
    private String getTabForType(String type) {
        if (type == null) return "canvas";
        switch (type.toLowerCase()) {
            case "music":
                return "music";
            case "note":
                return "notes";
            case "drawing":
            default:
                return "canvas";
        }
    }
}
