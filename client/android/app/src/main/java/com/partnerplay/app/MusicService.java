package com.partnerplay.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

public class MusicService extends Service implements MediaPlayer.OnPreparedListener, MediaPlayer.OnErrorListener, MediaPlayer.OnCompletionListener {
    private static final String TAG = "MusicService";
    public static final String CHANNEL_ID = "partner_music_playback_channel";
    public static final int NOTIFICATION_ID = 2002;

    public static final String ACTION_PLAY = "com.partnerplay.app.action.PLAY";
    public static final String ACTION_PAUSE = "com.partnerplay.app.action.PAUSE";
    public static final String ACTION_RESUME = "com.partnerplay.app.action.RESUME";
    public static final String ACTION_TOGGLE = "com.partnerplay.app.action.TOGGLE";
    public static final String ACTION_STOP = "com.partnerplay.app.action.STOP";

    private static MusicService instance;

    private MediaPlayer mediaPlayer;
    private PowerManager.WakeLock wakeLock;

    private String currentTrackId = "";
    private String currentTitle = "Our Playlist";
    private String currentArtist = "Partner Play";
    private String currentUrl = "";

    public static MusicService getInstance() {
        return instance;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        createNotificationChannel(this);

        try {
            PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
            if (pm != null) {
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "partnerplay:music_service_wakelock");
                wakeLock.setReferenceCounted(false);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error acquiring wakelock", e);
        }

        initMediaPlayer();
    }

    private void initMediaPlayer() {
        if (mediaPlayer == null) {
            mediaPlayer = new MediaPlayer();
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build();
            mediaPlayer.setAudioAttributes(audioAttributes);
            mediaPlayer.setWakeMode(getApplicationContext(), PowerManager.PARTIAL_WAKE_LOCK);
            mediaPlayer.setOnPreparedListener(this);
            mediaPlayer.setOnErrorListener(this);
            mediaPlayer.setOnCompletionListener(this);
            mediaPlayer.setLooping(true);
        }
    }

    public static void createNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && context != null) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Partner Music Playback",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Background music playback controls for Partner Play");
            channel.setShowBadge(false);
            channel.enableVibration(false);
            channel.setSound(null, null);

            NotificationManager nm = context.getSystemService(NotificationManager.class);
            if (nm != null) {
                nm.createNotificationChannel(channel);
            }
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_STICKY;

        String action = intent.getAction();
        if (ACTION_STOP.equals(action)) {
            stopPlayback();
            return START_NOT_STICKY;
        } else if (ACTION_PAUSE.equals(action)) {
            pauseMedia();
            updateNotification();
            return START_STICKY;
        } else if (ACTION_RESUME.equals(action)) {
            resumeMedia();
            updateNotification();
            return START_STICKY;
        } else if (ACTION_TOGGLE.equals(action)) {
            if (isPlaying()) {
                pauseMedia();
            } else {
                resumeMedia();
            }
            updateNotification();
            return START_STICKY;
        } else if (ACTION_PLAY.equals(action)) {
            String url = intent.getStringExtra("url");
            String title = intent.getStringExtra("title");
            String artist = intent.getStringExtra("artist");
            String trackId = intent.getStringExtra("trackId");
            double currentTime = intent.getDoubleExtra("currentTime", 0.0);

            if (title != null && !title.trim().isEmpty()) currentTitle = title;
            if (artist != null && !artist.trim().isEmpty()) currentArtist = artist;
            if (trackId != null && !trackId.trim().isEmpty()) currentTrackId = trackId;

            if (url != null && !url.trim().isEmpty()) {
                playSource(url, (int) (currentTime * 1000));
            } else {
                resumeMedia();
            }
            updateNotification();
        }

        return START_STICKY;
    }

    private void playSource(String url, int seekMs) {
        initMediaPlayer();
        currentUrl = url;

        try {
            mediaPlayer.reset();
            mediaPlayer.setLooping(true);

            if (url.startsWith("/music/")) {
                // Bundled APK asset file
                String assetPath = "public" + url;
                AssetFileDescriptor afd = getAssets().openFd(assetPath);
                mediaPlayer.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
                afd.close();
                mediaPlayer.prepare();
                if (seekMs > 0 && seekMs < mediaPlayer.getDuration()) {
                    mediaPlayer.seekTo(seekMs);
                }
                mediaPlayer.start();
                acquireWakeLock();
            } else if (url.startsWith("http://") || url.startsWith("https://")) {
                // Remote audio stream
                mediaPlayer.setDataSource(url);
                mediaPlayer.prepareAsync();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error playing audio source: " + url, e);
        }
    }

    private void pauseMedia() {
        if (mediaPlayer != null && mediaPlayer.isPlaying()) {
            try {
                mediaPlayer.pause();
            } catch (Exception ignored) {}
        }
        releaseWakeLock();
    }

    private void resumeMedia() {
        if (mediaPlayer != null) {
            try {
                mediaPlayer.start();
                acquireWakeLock();
            } catch (Exception ignored) {}
        }
    }

    public void seekTo(int msec) {
        if (mediaPlayer != null) {
            try {
                mediaPlayer.seekTo(msec);
            } catch (Exception ignored) {}
        }
    }

    public boolean isPlaying() {
        if (mediaPlayer != null) {
            try {
                return mediaPlayer.isPlaying();
            } catch (Exception ignored) {}
        }
        return false;
    }

    public double getCurrentPositionSec() {
        if (mediaPlayer != null) {
            try {
                return mediaPlayer.getCurrentPosition() / 1000.0;
            } catch (Exception ignored) {}
        }
        return 0;
    }

    public double getDurationSec() {
        if (mediaPlayer != null) {
            try {
                int dur = mediaPlayer.getDuration();
                return dur > 0 ? dur / 1000.0 : 0;
            } catch (Exception ignored) {}
        }
        return 0;
    }

    public String getCurrentTrackId() {
        return currentTrackId;
    }

    public String getCurrentTitle() {
        return currentTitle;
    }

    public String getCurrentArtist() {
        return currentArtist;
    }

    private void acquireWakeLock() {
        if (wakeLock != null && !wakeLock.isHeld()) {
            try {
                wakeLock.acquire(120 * 60 * 1000L); // 2 hours
            } catch (Exception ignored) {}
        }
    }

    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            try {
                wakeLock.release();
            } catch (Exception ignored) {}
        }
    }

    private void updateNotification() {
        createNotificationChannel(this);

        Intent openAppIntent = new Intent(this, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent openPending = PendingIntent.getActivity(
                this, 0, openAppIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent toggleIntent = new Intent(this, MusicService.class);
        toggleIntent.setAction(ACTION_TOGGLE);
        PendingIntent togglePending = PendingIntent.getService(
                this, 1, toggleIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent stopIntent = new Intent(this, MusicService.class);
        stopIntent.setAction(ACTION_STOP);
        PendingIntent stopPending = PendingIntent.getService(
                this, 2, stopIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        boolean playing = isPlaying();

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notification)
                .setContentTitle(currentTitle)
                .setContentText(currentArtist + (playing ? " • Playing" : " • Paused"))
                .setContentIntent(openPending)
                .setOngoing(playing)
                .setOnlyAlertOnce(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .addAction(playing ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play,
                        playing ? "Pause" : "Play", togglePending)
                .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Close", stopPending)
                .build();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    private void stopPlayback() {
        releaseWakeLock();
        if (mediaPlayer != null) {
            try {
                mediaPlayer.stop();
                mediaPlayer.reset();
                mediaPlayer.release();
            } catch (Exception ignored) {}
            mediaPlayer = null;
        }
        stopForeground(true);
        stopSelf();
    }

    @Override
    public void onPrepared(MediaPlayer mp) {
        try {
            mp.start();
            acquireWakeLock();
            updateNotification();
        } catch (Exception ignored) {}
    }

    @Override
    public boolean onError(MediaPlayer mp, int what, int extra) {
        Log.w(TAG, "MediaPlayer error: what=" + what + ", extra=" + extra);
        return false;
    }

    @Override
    public void onCompletion(MediaPlayer mp) {
        Log.d(TAG, "Track completed");
    }

    @Override
    public void onDestroy() {
        stopPlayback();
        instance = null;
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
