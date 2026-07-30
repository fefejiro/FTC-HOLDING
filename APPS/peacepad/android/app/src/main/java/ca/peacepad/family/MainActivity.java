package ca.peacepad.family;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import android.net.Uri;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    
    public static final String CHANNEL_ID_MESSAGES = "peacepad_messages";
    public static final String CHANNEL_ID_CONCH = "peacepad_conch";
    public static final String CHANNEL_ID_GENERAL = "peacepad_general";
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Create notification channels (required for Android 8+)
        createNotificationChannels();
        
        // Configure edge-to-edge display without EdgeToEdge.enable()
        // EdgeToEdge.enable() adds inset listeners that push WebView down (causing white header)
        // Instead, we manually set up transparent bars and let Capacitor/CSS handle safe areas
        configureSystemBars();
        
        // Keep screen on during Conch Mode sessions
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        
        // Configure WebView to handle microphone/camera permissions for WebRTC
        configureWebViewPermissions();
    }
    
    /**
     * Configure system bars for true edge-to-edge without any padding/insets.
     * 
     * We do NOT use EdgeToEdge.enable() because it adds OnApplyWindowInsetsListener
     * that applies top padding to the root view for the status bar height - creating
     * a white bar above the WebView.
     * 
     * Instead, we:
     * 1. Tell Android NOT to fit system windows (WebView extends behind status bar)
     * 2. Make status bar and navigation bar fully transparent
     * 3. Let the Capacitor StatusBar plugin + CSS safe-area-inset handle the rest
     */
    private void configureSystemBars() {
        // Critical: Tell Android the app will handle system bar areas itself
        // This prevents Android from adding top padding for the status bar
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        
        // On Android 14 and below, we need to explicitly configure system bars.
        // On Android 15+ (API 35+), edge-to-edge is enforced by default and these
        // APIs are deprecated no-ops - the system handles everything automatically.
        if (Build.VERSION.SDK_INT < 35) {
            getWindow().setStatusBarColor(Color.TRANSPARENT);
            getWindow().setNavigationBarColor(Color.TRANSPARENT);
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            getWindow().clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        }
        
        // Set status bar/nav bar icon appearance using the modern compat API
        // This works on all Android versions including 15+
        WindowInsetsControllerCompat insetsController = 
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        insetsController.setAppearanceLightStatusBars(true);
        insetsController.setAppearanceLightNavigationBars(true);
    }
    
    /**
     * Configure WebView to properly handle media permissions.
     * This is required for WebRTC audio/video calls in Conch Mode.
     * Without this, getUserMedia() calls in the WebView will fail silently.
     * 
     * Security: Only grants AUDIO_CAPTURE and VIDEO_CAPTURE permissions.
     * All other resource requests are denied for security.
     */
    private void configureWebViewPermissions() {
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                webView.setWebChromeClient(new WebChromeClient() {
                    @Override
                    public void onPermissionRequest(final PermissionRequest request) {
                        runOnUiThread(() -> {
                            if (!isTrustedMediaOrigin(request.getOrigin())) {
                                android.util.Log.w(
                                    "PeacePad",
                                    "Denied WebView media permission for untrusted origin"
                                );
                                request.deny();
                                return;
                            }

                            // Only grant audio and video capture permissions
                            // Deny all other resource types for security
                            String[] requestedResources = request.getResources();
                            java.util.ArrayList<String> grantedResources = new java.util.ArrayList<>();
                            
                            for (String resource : requestedResources) {
                                if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource) ||
                                    PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) {
                                    grantedResources.add(resource);
                                    android.util.Log.d("PeacePad", "Granting WebView permission: " + resource);
                                } else {
                                    android.util.Log.w("PeacePad", "Denying WebView permission: " + resource);
                                }
                            }
                            
                            if (!grantedResources.isEmpty()) {
                                request.grant(grantedResources.toArray(new String[0]));
                            } else {
                                request.deny();
                            }
                        });
                    }
                });
                
                // Enable JavaScript (should already be enabled by Capacitor)
                webView.getSettings().setJavaScriptEnabled(true);
                
                // Allow media playback without user gesture (for notifications/calls)
                webView.getSettings().setMediaPlaybackRequiresUserGesture(false);
            }
        } catch (Exception e) {
            // WebView may not be ready yet, Capacitor handles this normally
            android.util.Log.w("PeacePad", "WebView permission config deferred: " + e.getMessage());
        }
    }

    private boolean isTrustedMediaOrigin(Uri origin) {
        if (origin == null || origin.getScheme() == null || origin.getHost() == null) {
            return false;
        }

        String scheme = origin.getScheme().toLowerCase(java.util.Locale.ROOT);
        String host = origin.getHost().toLowerCase(java.util.Locale.ROOT);
        boolean securePeacePadOrigin =
            "https".equals(scheme) &&
            ("peacepad.ca".equals(host) || "www.peacepad.ca".equals(host));
        if (securePeacePadOrigin) {
            return true;
        }

        return BuildConfig.DEBUG &&
            ("http".equals(scheme) || "https".equals(scheme)) &&
            ("localhost".equals(host) || "127.0.0.1".equals(host));
    }
    
    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            
            // Messages channel - High importance for chat notifications
            // Uses system default sound/vibration which respects user's phone settings
            NotificationChannel messagesChannel = new NotificationChannel(
                CHANNEL_ID_MESSAGES,
                "Messages",
                NotificationManager.IMPORTANCE_HIGH
            );
            messagesChannel.setDescription("New messages from your co-parent");
            messagesChannel.enableVibration(true);
            messagesChannel.setVibrationPattern(new long[]{0, 250, 100, 250});
            messagesChannel.setShowBadge(true);
            notificationManager.createNotificationChannel(messagesChannel);
            
            // Conch Mode channel - High importance for turn notifications
            NotificationChannel conchChannel = new NotificationChannel(
                CHANNEL_ID_CONCH,
                "Conch Mode",
                NotificationManager.IMPORTANCE_HIGH
            );
            conchChannel.setDescription("It's your turn to speak in Conch Mode");
            conchChannel.enableVibration(true);
            conchChannel.setVibrationPattern(new long[]{0, 500, 200, 500});
            conchChannel.setShowBadge(true);
            notificationManager.createNotificationChannel(conchChannel);
            
            // General channel - Default importance for other notifications
            NotificationChannel generalChannel = new NotificationChannel(
                CHANNEL_ID_GENERAL,
                "General",
                NotificationManager.IMPORTANCE_DEFAULT
            );
            generalChannel.setDescription("Calendar reminders, expense updates, and more");
            generalChannel.enableVibration(true);
            generalChannel.setShowBadge(true);
            notificationManager.createNotificationChannel(generalChannel);
        }
    }
}
