using UnityEngine;
using GidiDashers.Core;

namespace GidiDashers.World
{
    /// <summary>
    /// Tile-based infinite ground spawner.
    /// Keep two or three ground tiles in a pool and recycle them ahead.
    /// </summary>
    public class GroundTileSpawner : MonoBehaviour
    {
        [SerializeField] private GameObject tilePrefab;
        [SerializeField] private int poolSize = 3;
        [SerializeField] private float tileWidth = 20f;

        private GameObject[] pool;
        private float nextSpawnX;

        private void Start()
        {
            pool = new GameObject[poolSize];
            nextSpawnX = 0f;

            for (int i = 0; i < poolSize; i++)
            {
                pool[i] = Instantiate(tilePrefab, new Vector3(nextSpawnX, 0f, 0f), Quaternion.identity);
                pool[i].AddComponent<ScrollingObject>();
                nextSpawnX += tileWidth;
            }
        }

        private void Update()
        {
            // Recycle the leftmost tile to the right
            foreach (var tile in pool)
            {
                if (tile.transform.position.x < -tileWidth)
                {
                    tile.transform.position = new Vector3(nextSpawnX, 0f, 0f);
                    nextSpawnX += tileWidth;
                    break; // only one per frame needed
                }
            }
        }
    }
}
