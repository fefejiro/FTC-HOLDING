const {
  AndroidConfig,
  WarningAggregator,
  createRunOncePlugin,
  withInfoPlist,
} = require("expo/config-plugins");

const pkg = require("../package.json");

const MICROPHONE_USAGE =
  "PeacePad uses the microphone only while you are in a foreground audio call.";
const CAMERA_USAGE =
  "PeacePad uses camera APIs to support optional video calling; this release uses microphone-only calls.";

function withPeacePadAudioWebRTC(config) {
  config = withInfoPlist(config, (nextConfig) => {
    nextConfig.modResults.NSMicrophoneUsageDescription = MICROPHONE_USAGE;
    nextConfig.modResults.NSCameraUsageDescription = CAMERA_USAGE;
    return nextConfig;
  });

  if (!config.ios) config.ios = {};
  if (config.ios.bitcode != null && config.ios.bitcode !== false) {
    WarningAggregator.addWarningIOS(
      "ios.bitcode",
      "PeacePad audio WebRTC requires bitcode to be disabled for physical iOS devices.",
    );
  }
  config.ios.bitcode = false;

  return AndroidConfig.Permissions.withPermissions(config, [
    "android.permission.ACCESS_NETWORK_STATE",
    "android.permission.INTERNET",
    "android.permission.MODIFY_AUDIO_SETTINGS",
    "android.permission.RECORD_AUDIO",
    "android.permission.WAKE_LOCK",
    "android.permission.BLUETOOTH",
  ]);
}

module.exports = createRunOncePlugin(
  withPeacePadAudioWebRTC,
  "peacepad-audio-webrtc",
  pkg.version,
);
