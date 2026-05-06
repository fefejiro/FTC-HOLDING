using UnityEngine;
using UnityEditor;
using UnityEditor.SceneManagement;
using System.Collections.Generic;
using GidiDashers.Core;
using GidiDashers.World;
using GidiDashers.Player;
using GidiDashers.UI;
using GidiDashers.Audio;

namespace GidiDashers.Editor
{
    /// <summary>
    /// Menu: Gidi Dashers → Build Scene
    /// Creates the complete Main scene with all GameObjects, components, and wiring.
    /// Run once after first import; re-run to rebuild from scratch.
    /// </summary>
    public static class SceneBuilder
    {
        private const string ScenePath = "Assets/Scenes/Main.unity";

        [MenuItem("Gidi Dashers/Build Main Scene")]
        public static void BuildScene()
        {
            // --- ensure Scenes folder exists ---
            if (!AssetDatabase.IsValidFolder("Assets/Scenes"))
                AssetDatabase.CreateFolder("Assets", "Scenes");

            // --- create new scene ---
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            // -------------------------------------------------------
            // CAMERA
            // -------------------------------------------------------
            var camGO = new GameObject("Main Camera");
            var cam = camGO.AddComponent<Camera>();
            cam.orthographic = true;
            cam.orthographicSize = 5f;
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = new Color(0.12f, 0.18f, 0.27f);
            cam.transform.position = new Vector3(0, 2, -10);
            camGO.tag = "MainCamera";
            camGO.AddComponent<AudioListener>();

            // -------------------------------------------------------
            // GROUND (visual + collider platform)
            // -------------------------------------------------------
            var groundLayer = CreateLayer("Ground", 3);
            var groundRoot = new GameObject("Ground");

            // Invisible static collider strip (player stands on this)
            var groundCol = new GameObject("GroundCollider");
            groundCol.transform.parent = groundRoot.transform;
            groundCol.layer = groundLayer;
            var bc = groundCol.AddComponent<BoxCollider2D>();
            bc.size = new Vector2(200f, 1f);
            bc.offset = new Vector2(0, -0.5f);
            groundCol.transform.position = new Vector3(0, -1f, 0);

            // -------------------------------------------------------
            // PLAYER
            // -------------------------------------------------------
            var playerGO = new GameObject("Player");
            playerGO.tag = "Player";
            playerGO.transform.position = new Vector3(-4f, 0.5f, 0);

            var sr = playerGO.AddComponent<SpriteRenderer>();
            sr.color = new Color(0.2f, 0.8f, 0.4f); // placeholder green until sprite assigned

            var rb = playerGO.AddComponent<Rigidbody2D>();
            rb.gravityScale = 1f; // real gravity comes from Physics2D -30 setting
            rb.constraints = RigidbodyConstraints2D.FreezeRotation;
            rb.collisionDetectionMode = CollisionDetectionMode2D.Continuous;

            // Stand collider
            var standCol = playerGO.AddComponent<CapsuleCollider2D>();
            standCol.size = new Vector2(0.6f, 1.1f);
            standCol.offset = new Vector2(0, 0);

            // Slide collider (disabled at start)
            var slideColGO = new GameObject("SlideCollider");
            slideColGO.transform.parent = playerGO.transform;
            slideColGO.transform.localPosition = Vector3.zero;
            var slideCol = slideColGO.AddComponent<CapsuleCollider2D>();
            slideCol.size = new Vector2(0.9f, 0.5f);
            slideCol.offset = new Vector2(0, -0.3f);
            slideCol.enabled = false;

            var anim = playerGO.AddComponent<Animator>();
            // Animator controller must be created manually and assigned in inspector

            var pc = playerGO.AddComponent<PlayerController>();
            // Assign fields via SerializedObject
            var pcSo = new SerializedObject(pc);
            pcSo.FindProperty("groundLayer").intValue = 1 << groundLayer;
            pcSo.FindProperty("standCollider").objectReferenceValue = standCol;
            pcSo.FindProperty("slideCollider").objectReferenceValue = slideCol;
            pcSo.ApplyModifiedProperties();

            // -------------------------------------------------------
            // WORLD ROOT
            // -------------------------------------------------------
            var worldRoot = new GameObject("WorldRoot");

            // WorldScroller
            var wsGO = new GameObject("WorldScroller");
            wsGO.transform.parent = worldRoot.transform;
            wsGO.AddComponent<WorldScroller>();

            // GroundTileSpawner
            var gtsGO = new GameObject("GroundTileSpawner");
            gtsGO.transform.parent = worldRoot.transform;
            gtsGO.AddComponent<GroundTileSpawner>();
            // Note: groundTilePrefab must be assigned in Inspector after creating prefab

            // ObstacleSpawner
            var obsGO = new GameObject("ObstacleSpawner");
            obsGO.transform.parent = worldRoot.transform;
            obsGO.AddComponent<ObstacleSpawner>();

            // CoinSpawner
            var coinSpawnGO = new GameObject("CoinSpawner");
            coinSpawnGO.transform.parent = worldRoot.transform;
            coinSpawnGO.AddComponent<CoinSpawner>();

            // -------------------------------------------------------
            // GAME MANAGER + AUDIO
            // -------------------------------------------------------
            var gmGO = new GameObject("GameManager");
            gmGO.AddComponent<GameManager>();
            gmGO.AddComponent<AudioManager>();

            // -------------------------------------------------------
            // UI CANVAS
            // -------------------------------------------------------
            var canvasGO = new GameObject("Canvas");
            var canvas = canvasGO.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvasGO.AddComponent<UnityEngine.UI.CanvasScaler>().uiScaleMode =
                UnityEngine.UI.CanvasScaler.ScaleMode.ScaleWithScreenSize;
            canvasGO.AddComponent<UnityEngine.UI.GraphicRaycaster>();

            // Panels
            var menuPanel    = CreatePanel(canvasGO, "MenuPanel",    Color.black, new Color(0,0,0,0.7f));
            var hudPanel      = CreatePanel(canvasGO, "HUDPanel",     Color.clear, Color.clear);
            var pausePanel    = CreatePanel(canvasGO, "PausePanel",   Color.black, new Color(0,0,0,0.7f));
            var gameOverPanel = CreatePanel(canvasGO, "GameOverPanel",Color.black, new Color(0,0,0,0.85f));
            menuPanel.SetActive(true);
            hudPanel.SetActive(false);
            pausePanel.SetActive(false);
            gameOverPanel.SetActive(false);

            // HUDController
            var hudCtrl = canvasGO.AddComponent<HUDController>();
            var hudSo = new SerializedObject(hudCtrl);
            hudSo.FindProperty("menuPanel").objectReferenceValue    = menuPanel;
            hudSo.FindProperty("hudPanel").objectReferenceValue     = hudPanel;
            hudSo.FindProperty("pausePanel").objectReferenceValue   = pausePanel;
            hudSo.FindProperty("gameOverPanel").objectReferenceValue = gameOverPanel;
            hudSo.ApplyModifiedProperties();

            // -------------------------------------------------------
            // EVENT SYSTEM
            // -------------------------------------------------------
            var evGO = new GameObject("EventSystem");
            evGO.AddComponent<UnityEngine.EventSystems.EventSystem>();
            evGO.AddComponent<UnityEngine.EventSystems.StandaloneInputModule>();

            // -------------------------------------------------------
            // SAVE SCENE
            // -------------------------------------------------------
            EditorSceneManager.SaveScene(scene, ScenePath);
            AssetDatabase.Refresh();

            // Add to build settings
            var buildScenes = new List<EditorBuildSettingsScene>(EditorBuildSettings.scenes)
            {
                new EditorBuildSettingsScene(ScenePath, true)
            };
            EditorBuildSettings.scenes = buildScenes.ToArray();

            Debug.Log("[GidiDashers] Main scene built and saved to " + ScenePath);
            EditorUtility.DisplayDialog("Scene Built", "Main.unity created at " + ScenePath + "\n\nNow assign prefabs in Inspector.", "OK");
        }

        // -------------------------------------------------------
        // Helpers
        // -------------------------------------------------------
        private static int CreateLayer(string name, int index)
        {
            // Layers are set in TagManager — we already set layer 3 = Ground via ProjectSettings.
            // Just return the index here.
            return index;
        }

        private static GameObject CreatePanel(GameObject canvas, string name, Color bg, Color imgColor)
        {
            var go = new GameObject(name);
            go.transform.SetParent(canvas.transform, false);
            var rect = go.AddComponent<RectTransform>();
            rect.anchorMin = Vector2.zero;
            rect.anchorMax = Vector2.one;
            rect.offsetMin = Vector2.zero;
            rect.offsetMax = Vector2.zero;
            var img = go.AddComponent<UnityEngine.UI.Image>();
            img.color = imgColor;
            return go;
        }
    }
}

