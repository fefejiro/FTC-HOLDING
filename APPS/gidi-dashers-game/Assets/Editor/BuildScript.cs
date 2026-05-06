using UnityEditor;
using UnityEditor.Android;
using UnityEngine;
using System;
using System.IO;

namespace GidiDashers.Editor
{
    /// <summary>
    /// Headless build script. Invoked via Unity -batchmode:
    ///   Unity.exe -batchmode -projectPath . -executeMethod GidiDashers.Editor.BuildScript.BuildAndroid -quit
    ///
    /// Expects env vars (or falls back to defaults):
    ///   KEYSTORE_PATH, KEYSTORE_PASS, KEY_ALIAS, KEY_PASS
    ///   ANDROID_SDK_ROOT, JAVA_HOME
    /// </summary>
    public static class BuildScript
    {
        private static readonly string OutputDir = Path.Combine(
            Application.dataPath, "..", "Builds", "Android");

        [MenuItem("Gidi Dashers/Build Android AAB")]
        public static void BuildAndroid()
        {
            // --- Configure Android SDK / JDK / NDK paths ---
            string sdkRoot = Env("ANDROID_SDK_ROOT",
                Env("ANDROID_HOME", @"C:\Users\mikef\AppData\Local\Android\Sdk"));
            // Use UNITY_JDK_ROOT to avoid collision with system JAVA_HOME (which may be Java 21)
            // Unity 6 requires JDK 17 exactly
            string jdkRoot = Env("UNITY_JDK_ROOT",
                @"C:\Program Files\Eclipse Adoptium\jdk-17.0.17.10-hotspot");
            string ndkRoot = Env("ANDROID_NDK_ROOT",
                @"C:\Users\mikef\AppData\Local\Android\Sdk\ndk\27.2.12479018");

            if (Directory.Exists(sdkRoot))
            {
                try { AndroidExternalToolsSettings.sdkRootPath = sdkRoot; }
                catch (Exception ex) { Debug.LogWarning($"[GidiDashers] SDK path error: {ex.Message}"); }
                Debug.Log($"[GidiDashers] Android SDK: {sdkRoot}");
            }
            else
            {
                Debug.LogWarning($"[GidiDashers] Android SDK not found at {sdkRoot}");
            }

            if (Directory.Exists(jdkRoot))
            {
                try
                {
                    AndroidExternalToolsSettings.jdkRootPath = jdkRoot;
                    Debug.Log($"[GidiDashers] JDK: {jdkRoot}");
                }
                catch (Exception ex)
                {
                    Debug.LogError($"[GidiDashers] JDK path rejected by Unity: {ex.Message}");
                    EditorApplication.Exit(1);
                    return;
                }
            }
            else
            {
                Debug.LogError($"[GidiDashers] JDK not found at {jdkRoot}");
                EditorApplication.Exit(1);
                return;
            }

            if (Directory.Exists(ndkRoot))
            {
                try { AndroidExternalToolsSettings.ndkRootPath = ndkRoot; }
                catch (Exception ex) { Debug.LogWarning($"[GidiDashers] NDK path error: {ex.Message}"); }
                Debug.Log($"[GidiDashers] NDK: {ndkRoot}");
            }
            else
            {
                Debug.LogWarning($"[GidiDashers] NDK not found at {ndkRoot} — build may fail");
            }

            Directory.CreateDirectory(OutputDir);
            string outputPath = Path.Combine(OutputDir, "GidiDashers.aab");

            // --- Signing ---
            string keystorePath = Env("KEYSTORE_PATH",
                Path.Combine(Application.dataPath, "..", "keystore", "gididashers.keystore"));
            string keystorePass = Env("KEYSTORE_PASS", "gididashers123");
            string keyAlias     = Env("KEY_ALIAS", "gididashers");
            string keyPass      = Env("KEY_PASS", "gididashers123");

            PlayerSettings.Android.keystoreName = keystorePath;
            PlayerSettings.Android.keystorePass = keystorePass;
            PlayerSettings.Android.keyaliasName = keyAlias;
            PlayerSettings.Android.keyaliasPass = keyPass;

            // --- Ensure scene exists ---
            string[] enabledScenes = GetEnabledScenes();
            if (enabledScenes.Length == 0)
            {
                Debug.Log("[GidiDashers] No scenes in build settings — running SceneBuilder...");
                SceneBuilder.BuildScene();
                enabledScenes = GetEnabledScenes();
                if (enabledScenes.Length == 0)
                {
                    Debug.LogError("[GidiDashers] SceneBuilder did not add any scenes. Cannot build.");
                    EditorApplication.Exit(1);
                    return;
                }
            }

            // --- Build options ---
            var options = new BuildPlayerOptions
            {
                scenes           = enabledScenes,
                locationPathName = outputPath,
                target           = BuildTarget.Android,
                options          = BuildOptions.None,
            };

            // Target AAB for Play Store
            EditorUserBuildSettings.buildAppBundle = true;
            EditorUserBuildSettings.androidBuildSystem = AndroidBuildSystem.Gradle;

            var report = BuildPipeline.BuildPlayer(options);
            var summary = report.summary;

            if (summary.result == UnityEditor.Build.Reporting.BuildResult.Succeeded)
            {
                Debug.Log($"[GidiDashers] Build succeeded → {outputPath}  ({summary.totalSize / 1_048_576} MB)");
            }
            else
            {
                Debug.LogError($"[GidiDashers] Build FAILED: {summary.result}");
                EditorApplication.Exit(1);
            }
        }

        private static string[] GetEnabledScenes()
        {
            var scenes = new System.Collections.Generic.List<string>();
            foreach (var s in EditorBuildSettings.scenes)
                if (s.enabled) scenes.Add(s.path);
            return scenes.ToArray();
        }

        private static string Env(string key, string fallback)
        {
            var val = System.Environment.GetEnvironmentVariable(key);
            return string.IsNullOrEmpty(val) ? fallback : val;
        }
    }
}
