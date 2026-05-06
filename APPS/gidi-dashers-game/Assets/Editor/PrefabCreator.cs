using UnityEngine;
using UnityEditor;
using System.IO;

namespace GidiDashers.Editor
{
    /// <summary>
    /// Menu: Gidi Dashers → Create Placeholder Prefabs
    /// Generates coloured-quad prefabs for GroundTile, all four obstacle types, and Coin.
    /// Run once. Re-run to overwrite.
    /// </summary>
    public static class PrefabCreator
    {
        private const string PrefabDir = "Assets/Prefabs";

        [MenuItem("Gidi Dashers/Create Placeholder Prefabs")]
        public static void CreateAll()
        {
            EnsureFolder(PrefabDir);
            EnsureFolder(PrefabDir + "/Obstacles");

            // Ground tile — wide flat brown strip
            CreateGroundTile();

            // Obstacles
            CreateObstaclePrefab("Pothole",     new Color(0.2f, 0.2f, 0.2f),  new Vector2(1.2f, 0.4f));
            CreateObstaclePrefab("Danfo",       new Color(0.9f, 0.7f, 0.0f),  new Vector2(2.0f, 1.4f));
            CreateObstaclePrefab("NEPAPole",    new Color(0.5f, 0.5f, 0.5f),  new Vector2(0.3f, 2.5f));
            CreateObstaclePrefab("MarketStall", new Color(0.8f, 0.3f, 0.1f),  new Vector2(2.5f, 1.8f));

            // Naira coin
            CreateCoinPrefab();

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            Debug.Log("[GidiDashers] Placeholder prefabs created in " + PrefabDir);
            EditorUtility.DisplayDialog("Prefabs Created",
                "Placeholder prefabs created in Assets/Prefabs/\n\nAssign them to GroundTileSpawner and ObstacleSpawner in the Inspector.",
                "OK");
        }

        // ── Ground tile ──────────────────────────────────────────────────────
        private static void CreateGroundTile()
        {
            var go = new GameObject("GroundTile");
            go.transform.localScale = new Vector3(20f, 2f, 1f);

            var sr = go.AddComponent<SpriteRenderer>();
            sr.sprite = CreateQuadSprite(new Color(0.55f, 0.35f, 0.1f));
            sr.sortingOrder = -1;

            // ScrollingObject component (moves with world)
            go.AddComponent<GidiDashers.World.ScrollingObject>();

            // BoxCollider2D so player lands on it
            var bc = go.AddComponent<BoxCollider2D>();
            bc.size = new Vector2(1f, 1f); // matches localScale after normalisation
            bc.offset = new Vector2(0f, 0f);

            string path = PrefabDir + "/GroundTile.prefab";
            SavePrefab(go, path);
            Object.DestroyImmediate(go);
        }

        // ── Obstacle prefab ──────────────────────────────────────────────────
        private static void CreateObstaclePrefab(string name, Color col, Vector2 size)
        {
            var go = new GameObject(name);
            go.tag = "Obstacle";
            go.transform.localScale = new Vector3(size.x, size.y, 1f);

            var sr = go.AddComponent<SpriteRenderer>();
            sr.sprite = CreateQuadSprite(col);
            sr.sortingOrder = 0;

            go.AddComponent<BoxCollider2D>().isTrigger = true;

            string path = PrefabDir + "/Obstacles/" + name + ".prefab";
            SavePrefab(go, path);
            Object.DestroyImmediate(go);
        }

        // ── Coin prefab ──────────────────────────────────────────────────────
        private static void CreateCoinPrefab()
        {
            var go = new GameObject("NairaCoin");
            go.tag = "Coin";
            go.transform.localScale = Vector3.one * 0.5f;

            var sr = go.AddComponent<SpriteRenderer>();
            sr.sprite = CreateQuadSprite(new Color(1f, 0.84f, 0f)); // gold
            sr.sortingOrder = 1;

            var cc = go.AddComponent<CircleCollider2D>();
            cc.isTrigger = true;
            cc.radius = 0.5f;

            go.AddComponent<GidiDashers.World.CoinPickup>();

            string path = PrefabDir + "/NairaCoin.prefab";
            SavePrefab(go, path);
            Object.DestroyImmediate(go);
        }

        // ── Helpers ──────────────────────────────────────────────────────────
        private static void SavePrefab(GameObject go, string path)
        {
            PrefabUtility.SaveAsPrefabAsset(go, path);
        }

        private static Sprite CreateQuadSprite(Color col)
        {
            var tex = new Texture2D(32, 32);
            var pixels = new Color[32 * 32];
            for (int i = 0; i < pixels.Length; i++) pixels[i] = col;
            tex.SetPixels(pixels);
            tex.Apply();
            return Sprite.Create(tex, new Rect(0, 0, 32, 32), new Vector2(0.5f, 0.5f), 32f);
        }

        private static void EnsureFolder(string path)
        {
            if (!AssetDatabase.IsValidFolder(path))
            {
                var parts = path.Split('/');
                string parent = parts[0];
                for (int i = 1; i < parts.Length; i++)
                {
                    string combined = parent + "/" + parts[i];
                    if (!AssetDatabase.IsValidFolder(combined))
                        AssetDatabase.CreateFolder(parent, parts[i]);
                    parent = combined;
                }
            }
        }
    }
}
