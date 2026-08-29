using System;
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Jci.Editor
{
    /// <summary>
    /// Batch build entrypoints for Just Checking In.
    /// Called by scripts/build-just-checking-in-android.ps1 and export-just-checking-in-ios.ps1.
    /// </summary>
    public static class BuildScript
    {
        private const string MarketingVersion = "1.1.0";
        private const int AndroidVersionCode = 3;
        private const string IosBuildNumber = "4";
        private const string AndroidOutputPath = "Builds/Android/JustCheckingIn.aab";
        private const string IosOutputPath = "Builds/iOS/JustCheckingIn";
        private const string BootScenePath = "Assets/_Game/Scenes/Boot.unity";
        private const string AppIconPath = "Assets/_Game/Art/jci-icon.png";

        [MenuItem("JCI/Build Android AAB")]
        public static void BuildAndroid()
        {
            ConfigureCommonPlayerSettings();
            ConfigureAndroidPlayerSettings();

            string keystorePath = ResolveKeystorePath(RequireEnvAny("KEYSTORE_PATH", "ANDROID_KEYSTORE_NAME"));
            string keystorePass = RequireEnvAny("KEYSTORE_PASS", "ANDROID_KEYSTORE_PASS");
            string keyAlias = RequireEnvAny("KEY_ALIAS", "ANDROID_KEYALIAS_NAME");
            string keyPass = RequireEnvAny("KEY_PASS", "ANDROID_KEYALIAS_PASS");

            if (!File.Exists(keystorePath))
            {
                Fail($"KEYSTORE_PATH does not exist: {keystorePath}");
                return;
            }

            PlayerSettings.Android.useCustomKeystore = true;
            PlayerSettings.Android.keystoreName = keystorePath;
            PlayerSettings.Android.keystorePass = keystorePass;
            PlayerSettings.Android.keyaliasName = keyAlias;
            PlayerSettings.Android.keyaliasPass = keyPass;

            Directory.CreateDirectory("Builds/Android");
            var scenes = EnsureBuildScenes();

            EditorUserBuildSettings.buildAppBundle = true;
            EditorUserBuildSettings.androidBuildSystem = AndroidBuildSystem.Gradle;

            var options = new BuildPlayerOptions
            {
                scenes = scenes,
                locationPathName = AndroidOutputPath,
                target = BuildTarget.Android,
                options = BuildOptions.None,
                targetGroup = BuildTargetGroup.Android
            };

            BuildReport report = BuildPipeline.BuildPlayer(options);
            if (report.summary.result != BuildResult.Succeeded)
            {
                Fail($"Android build failed: {report.summary.result}");
                return;
            }

            Debug.Log($"[JCI] Android build succeeded: {AndroidOutputPath}");
        }

        [MenuItem("JCI/Build Android APK For Device")]
        public static void BuildAndroidApkForDevice()
        {
            ConfigureCommonPlayerSettings();
            ConfigureAndroidPlayerSettings();

            string keystorePath = ResolveKeystorePath(RequireEnvAny("KEYSTORE_PATH", "ANDROID_KEYSTORE_NAME"));
            string keystorePass = RequireEnvAny("KEYSTORE_PASS", "ANDROID_KEYSTORE_PASS");
            string keyAlias = RequireEnvAny("KEY_ALIAS", "ANDROID_KEYALIAS_NAME");
            string keyPass = RequireEnvAny("KEY_PASS", "ANDROID_KEYALIAS_PASS");

            if (!File.Exists(keystorePath))
            {
                Fail($"KEYSTORE_PATH does not exist: {keystorePath}");
                return;
            }

            PlayerSettings.Android.useCustomKeystore = true;
            PlayerSettings.Android.keystoreName = keystorePath;
            PlayerSettings.Android.keystorePass = keystorePass;
            PlayerSettings.Android.keyaliasName = keyAlias;
            PlayerSettings.Android.keyaliasPass = keyPass;

            const string outputPath = "Builds/Android/JustCheckingIn-device.apk";
            Directory.CreateDirectory("Builds/Android");
            EditorUserBuildSettings.buildAppBundle = false;
            EditorUserBuildSettings.androidBuildSystem = AndroidBuildSystem.Gradle;

            BuildReport report = BuildPipeline.BuildPlayer(new BuildPlayerOptions
            {
                scenes = EnsureBuildScenes(),
                locationPathName = outputPath,
                target = BuildTarget.Android,
                options = BuildOptions.None,
                targetGroup = BuildTargetGroup.Android
            });

            if (report.summary.result != BuildResult.Succeeded)
            {
                Fail($"Android device APK build failed: {report.summary.result}");
                return;
            }

            Debug.Log($"[JCI] Android device APK build succeeded: {outputPath}");
        }

        [MenuItem("JCI/Export iOS Xcode")]
        public static void ExportiOS()
        {
            ConfigureCommonPlayerSettings();
            ConfigureIosPlayerSettings();

            Directory.CreateDirectory("Builds/iOS");
            var scenes = EnsureBuildScenes();

            var options = new BuildPlayerOptions
            {
                scenes = scenes,
                locationPathName = IosOutputPath,
                target = BuildTarget.iOS,
                options = BuildOptions.None,
                targetGroup = BuildTargetGroup.iOS
            };

            BuildReport report = BuildPipeline.BuildPlayer(options);
            if (report.summary.result != BuildResult.Succeeded)
            {
                Fail($"iOS export failed: {report.summary.result}");
                return;
            }

            Debug.Log($"[JCI] iOS export succeeded: {IosOutputPath}");
        }

        private static void ConfigureCommonPlayerSettings()
        {
            PlayerSettings.productName = "Just Checking In";
            PlayerSettings.bundleVersion = MarketingVersion;
            PlayerSettings.Android.bundleVersionCode = AndroidVersionCode;
            PlayerSettings.iOS.buildNumber = IosBuildNumber;
            PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.Android, "com.ftcholding.justcheckingin");
            PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.iOS, "com.ftcholding.justcheckingin");
            ConfigureAppIcon();

            // Keep launch mobile-first and portrait.
            PlayerSettings.defaultInterfaceOrientation = UIOrientation.Portrait;
            PlayerSettings.allowedAutorotateToLandscapeLeft = false;
            PlayerSettings.allowedAutorotateToLandscapeRight = false;
            PlayerSettings.allowedAutorotateToPortraitUpsideDown = false;

            PlayerSettings.SetScriptingBackend(NamedBuildTarget.Android, ScriptingImplementation.IL2CPP);
            PlayerSettings.SetScriptingBackend(NamedBuildTarget.iOS, ScriptingImplementation.IL2CPP);
        }

        private static void ConfigureAppIcon()
        {
            var importer = AssetImporter.GetAtPath(AppIconPath) as TextureImporter;
            if (importer != null && importer.textureCompression != TextureImporterCompression.Uncompressed)
            {
                importer.textureCompression = TextureImporterCompression.Uncompressed;
                importer.SaveAndReimport();
            }

            var icon = AssetDatabase.LoadAssetAtPath<Texture2D>(AppIconPath);
            if (icon == null)
            {
                Fail($"Missing app icon asset: {AppIconPath}");
                return;
            }

            PlayerSettings.SetIcons(NamedBuildTarget.Android, new[] { icon }, IconKind.Application);
            PlayerSettings.SetIcons(NamedBuildTarget.iOS, new[] { icon }, IconKind.Application);
        }

        private static void ConfigureAndroidPlayerSettings()
        {
            PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;
            // Just Checking In is intentionally offline. Do not request network access
            // that the game does not need.
            PlayerSettings.Android.forceInternetPermission = false;
            PlayerSettings.Android.forceSDCardPermission = false;
        }

        private static void ConfigureIosPlayerSettings()
        {
            string teamId = Environment.GetEnvironmentVariable("JCI_APPLE_TEAM_ID");
            if (!string.IsNullOrWhiteSpace(teamId))
            {
                PlayerSettings.iOS.appleDeveloperTeamID = teamId;
            }

            PlayerSettings.iOS.appleEnableAutomaticSigning = true;
            PlayerSettings.iOS.targetDevice = iOSTargetDevice.iPhoneAndiPad;
        }

        private static string[] EnsureBuildScenes()
        {
            if (!File.Exists(BootScenePath))
            {
                Directory.CreateDirectory(Path.GetDirectoryName(BootScenePath) ?? "Assets/_Game/Scenes");
                Scene scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
                scene.name = "Boot";
                EditorSceneManager.SaveScene(scene, BootScenePath, true);
            }

            var scenes = new List<EditorBuildSettingsScene>
            {
                new EditorBuildSettingsScene(BootScenePath, true)
            };

            EditorBuildSettings.scenes = scenes.ToArray();
            return new[] { BootScenePath };
        }

        private static string RequireEnv(string name)
        {
            string value = Environment.GetEnvironmentVariable(name);
            if (!string.IsNullOrWhiteSpace(value))
            {
                return value;
            }

            Fail($"Missing required environment variable: {name}");
            return string.Empty;
        }

        private static string RequireEnvAny(string name, params string[] aliases)
        {
            string value = Environment.GetEnvironmentVariable(name);
            if (!string.IsNullOrWhiteSpace(value))
            {
                return value;
            }

            foreach (string alias in aliases)
            {
                value = Environment.GetEnvironmentVariable(alias);
                if (!string.IsNullOrWhiteSpace(value))
                {
                    return value;
                }
            }

            Fail($"Missing required environment variable: {name}");
            return string.Empty;
        }

        private static string ResolveKeystorePath(string configuredPath)
        {
            if (Path.IsPathRooted(configuredPath) || File.Exists(configuredPath))
            {
                return configuredPath;
            }

            string projectRoot = Path.GetDirectoryName(Application.dataPath) ?? Directory.GetCurrentDirectory();
            string projectRelativePath = Path.Combine(projectRoot, configuredPath);
            return File.Exists(projectRelativePath) ? projectRelativePath : configuredPath;
        }

        private static void Fail(string message)
        {
            Debug.LogError($"[JCI] {message}");
            EditorApplication.Exit(1);
        }
    }
}
