package com.saywetin.app

import android.content.Context
import android.media.AudioDeviceInfo
import android.media.AudioManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableNativeMap

class AudioRouteModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "AudioRouteModule"

  @ReactMethod
  fun getCurrentRoute(promise: Promise) {
    try {
      val audioManager = reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
      val outputRoute = resolveOutputRoute(audioManager)
      val inputRoute = resolveInputRoute(audioManager)
      val result = WritableNativeMap().apply {
        putString("outputRoute", outputRoute)
        putString("inputRoute", inputRoute)
        putBoolean("isPrivateListening", outputRoute == "bluetooth" || outputRoute == "wired_headphones")
        putBoolean("canAttemptInternalCapture", false)
        putString("platform", "android")
      }
      promise.resolve(result)
    } catch (error: Exception) {
      promise.reject("AUDIO_ROUTE_ERROR", error)
    }
  }

  private fun resolveOutputRoute(audioManager: AudioManager): String {
    val devices = audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
    if (devices.any { isBluetoothOutput(it) }) {
      return "bluetooth"
    }
    if (devices.any { isWiredOutput(it) }) {
      return "wired_headphones"
    }
    if (devices.any { it.type == AudioDeviceInfo.TYPE_BUILTIN_EARPIECE }) {
      return "earpiece"
    }
    if (devices.any { it.type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER }) {
      return "speaker"
    }
    return "unknown"
  }

  private fun resolveInputRoute(audioManager: AudioManager): String {
    val devices = audioManager.getDevices(AudioManager.GET_DEVICES_INPUTS)
    if (devices.any { isBluetoothInput(it) }) {
      return "bluetooth_mic"
    }
    if (devices.any { isWiredInput(it) }) {
      return "wired_mic"
    }
    if (devices.any { it.type == AudioDeviceInfo.TYPE_BUILTIN_MIC }) {
      return "built_in_mic"
    }
    return "unknown"
  }

  private fun isBluetoothOutput(device: AudioDeviceInfo): Boolean {
    return when (device.type) {
      AudioDeviceInfo.TYPE_BLUETOOTH_A2DP,
      AudioDeviceInfo.TYPE_BLE_HEADSET,
      AudioDeviceInfo.TYPE_BLE_SPEAKER -> true
      else -> false
    }
  }

  private fun isWiredOutput(device: AudioDeviceInfo): Boolean {
    return when (device.type) {
      AudioDeviceInfo.TYPE_WIRED_HEADPHONES,
      AudioDeviceInfo.TYPE_WIRED_HEADSET,
      AudioDeviceInfo.TYPE_USB_HEADSET,
      AudioDeviceInfo.TYPE_USB_DEVICE,
      AudioDeviceInfo.TYPE_USB_ACCESSORY -> true
      else -> false
    }
  }

  private fun isBluetoothInput(device: AudioDeviceInfo): Boolean {
    return when (device.type) {
      AudioDeviceInfo.TYPE_BLUETOOTH_SCO,
      AudioDeviceInfo.TYPE_BLE_HEADSET -> true
      else -> false
    }
  }

  private fun isWiredInput(device: AudioDeviceInfo): Boolean {
    return when (device.type) {
      AudioDeviceInfo.TYPE_WIRED_HEADSET,
      AudioDeviceInfo.TYPE_USB_HEADSET,
      AudioDeviceInfo.TYPE_USB_DEVICE,
      AudioDeviceInfo.TYPE_USB_ACCESSORY -> true
      else -> false
    }
  }
}