package com.saywetin.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.tchvu3.capacitorvoicerecorder.VoiceRecorder;
import io.capawesome.capacitorjs.plugins.foregroundservice.ForegroundServicePlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(VoiceRecorder.class);
        registerPlugin(ForegroundServicePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
