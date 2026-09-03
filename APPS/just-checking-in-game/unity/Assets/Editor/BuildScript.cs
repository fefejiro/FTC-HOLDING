using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
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
        // 1.2.0/build 4/5 are already consumed. This shared correction is
        // Android code 6 was consumed by the rejected Play draft; iOS build 6 remains valid.
        private const string MarketingVersion = "1.2.0";
        private const int AndroidVersionCode = 7;
        private const string IosBuildNumber = "6";
        private const string AndroidOutputPath = "Builds/Android/JustCheckingIn.aab";
        private const string IosOutputPath = "Builds/iOS/JustCheckingIn";
        private const string BootScenePath = "Assets/_Game/Scenes/Boot.unity";
        private const string AppIconPath = "Assets/_Game/Art/jci-sun-icon.png";

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
            EditorUserBuildSettings.SwitchActiveBuildTarget(BuildTargetGroup.Android, BuildTarget.Android);
            ConfigureCommonPlayerSettings();
            ConfigureAndroidPlayerSettings();
            // Use the canonical IL2CPP backend; Android ARM64 is not supported by Mono.
            PlayerSettings.SetScriptingBackend(NamedBuildTarget.Android, ScriptingImplementation.IL2CPP);
            // Re-apply ARM64 immediately before BuildPlayer after backend selection.
            PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;

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

            ConfigureLegacyIcons(NamedBuildTarget.Android, icon);
            ConfigureLegacyIcons(NamedBuildTarget.iOS, icon);
            ConfigurePlatformIcons(NamedBuildTarget.Android, icon);
            ConfigurePlatformIcons(NamedBuildTarget.iOS, icon);
        }

        private static void ConfigureLegacyIcons(NamedBuildTarget target, Texture2D icon)
        {
            int requiredSlots = PlayerSettings.GetIconSizes(target, IconKind.Application).Length;
            if (requiredSlots < 1)
            {
                requiredSlots = 1;
            }

            var icons = new Texture2D[requiredSlots];
            for (int index = 0; index < icons.Length; index++)
            {
                icons[index] = icon;
            }

            PlayerSettings.SetIcons(target, icons, IconKind.Application);
        }

        private static void ConfigurePlatformIcons(NamedBuildTarget target, Texture2D icon)
        {
            foreach (PlatformIconKind kind in PlayerSettings.GetSupportedIconKinds(target))
            {
                PlatformIcon[] slots = PlayerSettings.GetPlatformIcons(target, kind);
                if (slots == null || slots.Length == 0)
                {
                    continue;
                }

                foreach (PlatformIcon slot in slots)
                {
                    int layers = Math.Max(1, slot.maxLayerCount);
                    var textures = new Texture2D[layers];
                    for (int layer = 0; layer < textures.Length; layer++)
                    {
                        textures[layer] = icon;
                    }

                    slot.SetTextures(textures);
                }

                PlayerSettings.SetPlatformIcons(target, kind, slots);
            }
        }

        private static void ConfigureAndroidPlayerSettings()
        {
            ConfigureAndroidToolchain();
            PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;
            // Just Checking In is intentionally offline. Do not request network access
            // that the game does not need.
            PlayerSettings.Android.forceInternetPermission = false;
            PlayerSettings.Android.forceSDCardPermission = false;
        }

        private static void ConfigureAndroidToolchain()
        {
            // Unity otherwise falls back to the per-user C: SDK, which is easy to
            // exhaust on this host. Respect the verified D:-backed toolchain when
            // the caller provides it, while retaining Unity's configured defaults.
            string sdkRoot = Environment.GetEnvironmentVariable("JCI_ANDROID_SDK_ROOT");
            string ndkRoot = Environment.GetEnvironmentVariable("JCI_ANDROID_NDK_ROOT");
            string jdkRoot = Environment.GetEnvironmentVariable("JCI_ANDROID_JDK_ROOT");

            // The iOS-only Unity editor may not have the Android module loaded.
            // Use reflection so the shared build script compiles on both hosts;
            // Android builds still receive the verified toolchain overrides.
            SetAndroidToolPath("sdkRootPath", sdkRoot);
            SetAndroidToolPath("ndkRootPath", ndkRoot);
            SetAndroidToolPath("jdkRootPath", jdkRoot);
        }

        private static void SetAndroidToolPath(string propertyName, string path)
        {
            if (string.IsNullOrWhiteSpace(path) || !Directory.Exists(path))
            {
                return;
            }

            Type settingsType = Type.GetType("UnityEditor.Android.AndroidExternalToolsSettings, UnityEditor.Android.Extensions");
            PropertyInfo property = settingsType?.GetProperty(propertyName, BindingFlags.Public | BindingFlags.Static);
            property?.SetValue(null, path);
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

            string projectRoot = Path.GetDirectoryName(UnityEngine.Application.dataPath) ?? Directory.GetCurrentDirectory();
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
