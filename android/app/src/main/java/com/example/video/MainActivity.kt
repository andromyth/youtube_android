package com.example.video
import expo.modules.splashscreen.SplashScreenManager

import android.os.Build
import android.os.Bundle

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
  // @generated begin videoapp-pip
  override fun onPictureInPictureModeChanged(inPictureInPicture: Boolean, newConfig: android.content.res.Configuration) {
    super.onPictureInPictureModeChanged(inPictureInPicture, newConfig)
    expo.modules.videoappview.VideoPictureInPicture.onModeChanged(this, inPictureInPicture)
  }

  override fun onUserLeaveHint() {
    super.onUserLeaveHint()
    expo.modules.videoappview.VideoPictureInPicture.onUserLeaveHint(this)
  }
  // @generated end videoapp-pip


  private fun syncDisplayMetricsToCurrentDisplay() {
    val activityMetrics = resources.displayMetrics
    val screenMetrics = android.util.DisplayMetrics()
    screenMetrics.setTo(activityMetrics)
    try {
      @Suppress("DEPRECATION")
      (getSystemService(android.content.Context.WINDOW_SERVICE) as android.view.WindowManager)
        .defaultDisplay
        .getRealMetrics(screenMetrics)
    } catch (e: Exception) {
      // Non-visual context; the copy made above is a good enough fallback.
    }
    // getRealMetrics() reports real pixel bounds but the *default* display's
    // density, so keep its bounds and take the density from this activity.
    screenMetrics.density = activityMetrics.density
    screenMetrics.densityDpi = activityMetrics.densityDpi
    @Suppress("DEPRECATION")
    screenMetrics.scaledDensity = activityMetrics.scaledDensity
    screenMetrics.xdpi = activityMetrics.xdpi
    screenMetrics.ydpi = activityMetrics.ydpi
    com.facebook.react.uimanager.DisplayMetricsHolder.setScreenDisplayMetrics(screenMetrics)
    com.facebook.react.uimanager.DisplayMetricsHolder.setWindowDisplayMetrics(activityMetrics)
    expo.modules.videoappview.videoController.updateDesktopMode(this)
  }

  override fun onResume() {
    super.onResume()
    syncDisplayMetricsToCurrentDisplay()
  }

  override fun onConfigurationChanged(newConfig: android.content.res.Configuration) {
    super.onConfigurationChanged(newConfig)
    syncDisplayMetricsToCurrentDisplay()
    window?.decorView?.requestLayout()
  }

  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    if (hasFocus) {
      syncDisplayMetricsToCurrentDisplay()
    }
  }


  override fun onNewIntent(intent: android.content.Intent) {
    setIntent(intent)
    super.onNewIntent(intent)
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    // setTheme(R.style.AppTheme);
    // @generated begin expo-splashscreen - expo prebuild (DO NOT MODIFY) sync-f3ff59a738c56c9a6119210cb55f0b613eb8b6af
    SplashScreenManager.registerOnActivity(this)
    // @generated end expo-splashscreen
    super.onCreate(null)
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "main"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  /**
    * Align the back button behavior with Android S
    * where moving root activities to background instead of finishing activities.
    * @see <a href="https://developer.android.com/reference/android/app/Activity#onBackPressed()">onBackPressed</a>
    */
  override fun invokeDefaultOnBackPressed() {
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              // For non-root activities, use the default implementation to finish them.
              super.invokeDefaultOnBackPressed()
          }
          return
      }

      // Use the default back button implementation on Android S
      // because it's doing more than [Activity.moveTaskToBack] in fact.
      super.invokeDefaultOnBackPressed()
  }
}
