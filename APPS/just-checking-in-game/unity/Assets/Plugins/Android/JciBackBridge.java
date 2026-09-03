package com.ftcholding.justcheckingin;

import android.app.Activity;
import android.os.Build;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;

import com.unity3d.player.UnityPlayer;

/** Routes Android system Back to the JCI screen history without taking over system bars. */
public final class JciBackBridge {
    private static OnBackInvokedCallback callback;

    private JciBackBridge() {
    }

    public static void register(Activity activity) {
        if (activity == null || Build.VERSION.SDK_INT < 33 || callback != null) {
            return;
        }

        callback = new OnBackInvokedCallback() {
            @Override
            public void onBackInvoked() {
                UnityPlayer.UnitySendMessage("Just Checking In Game", "OnAndroidBackInvoked", "");
            }
        };

        activity.getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                OnBackInvokedDispatcher.PRIORITY_OVERLAY,
                callback);
    }

    public static void unregister(Activity activity) {
        if (activity == null || Build.VERSION.SDK_INT < 33 || callback == null) {
            return;
        }

        activity.getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback(callback);
        callback = null;
    }
}
