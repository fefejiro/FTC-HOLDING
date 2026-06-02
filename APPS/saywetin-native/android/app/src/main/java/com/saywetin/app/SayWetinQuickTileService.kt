package com.saywetin.app

import android.app.PendingIntent
import android.content.Intent
import android.graphics.drawable.Icon
import android.net.Uri
import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService

class SayWetinQuickTileService : TileService() {
  override fun onStartListening() {
    super.onStartListening()

    qsTile?.let { tile ->
      tile.label = getString(R.string.quick_tile_label)
      tile.icon = Icon.createWithResource(this, R.mipmap.ic_launcher_foreground)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        tile.subtitle = getString(R.string.quick_tile_subtitle)
      }
      tile.state = Tile.STATE_ACTIVE
      tile.updateTile()
    }
  }

  override fun onClick() {
    super.onClick()

    val deepLink = Uri.parse("saywetin://listen?autostart=${System.currentTimeMillis()}")
    val launchIntent = Intent(Intent.ACTION_VIEW, deepLink).apply {
      setPackage(packageName)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
      addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      val pendingIntent = PendingIntent.getActivity(
        this,
        0,
        launchIntent,
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
      )
      startActivityAndCollapse(pendingIntent)
    } else {
      @Suppress("DEPRECATION")
      startActivityAndCollapse(launchIntent)
    }
  }
}
