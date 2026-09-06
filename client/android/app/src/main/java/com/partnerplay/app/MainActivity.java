package com.partnerplay.app;

import android.content.Intent;
import android.os.Bundle;
import android.os.PowerManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private PowerManager.WakeLock wakeLock;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetBridgePlugin.class);
        super.onCreate(savedInstanceState);

        // Ensure partner notification channel is registered with Android system immediately on startup
        try {
            FCMService.createNotificationChannel(this);
        } catch (Exception e) {
            e.printStackTrace();
        }

        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                WebSettings settings = webView.getSettings();
                settings.setMediaPlaybackRequiresUserGesture(false);
                settings.setJavaScriptCanOpenWindowsAutomatically(true);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        // Acquire a partial wake lock so the CPU stays active for audio playback in background
        try {
            PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
            if (pm != null) {
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "partnerplay:audio");
                wakeLock.setReferenceCounted(false);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
    }

    @Override
    public void onBackPressed() {
        // Move app to background instead of destroying MainActivity,
        // so music and real-time syncing keep playing seamlessly!
        moveTaskToBack(true);
    }

    @Override
    public void onPause() {
        super.onPause();
        // Keep webview timers and media pipeline running so background music and WebSockets don't get paused
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                webView.onResume(); // Prevents Android WebView from pausing HTML5 audio
                webView.resumeTimers();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        // Hold wake lock to keep CPU alive for audio
        try {
            if (wakeLock != null && !wakeLock.isHeld()) {
                wakeLock.acquire(60 * 60 * 1000L); // 60 min
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onStop() {
        super.onStop();
        // Ensure timers and media still run even after onStop (e.g. screen off or user switches apps)
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                webView.onResume();
                webView.resumeTimers();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        // Release wake lock when user returns to the app
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
