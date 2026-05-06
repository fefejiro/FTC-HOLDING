using System.Collections.Generic;
using UnityEngine;

namespace GidiDashers.World
{
    /// <summary>
    /// Spawns obstacles from a pool. Nigeria-themed obstacles:
    ///   - Pothole  (ground-level duck)
    ///   - Danfo    (mid-air jump)
    ///   - NEPA pole (tall jump)
    ///   - Market stall barrier (jump or slide)
    /// </summary>
    public class ObstacleSpawner : MonoBehaviour
    {
        [System.Serializable]
        public struct ObstacleEntry
        {
            public string displayName; // "Pothole", "Danfo", etc.
            public GameObject prefab;
            [Range(0f, 1f)] public float weight;
        }

        [SerializeField] private ObstacleEntry[] obstacles;
        [SerializeField] private int poolSizePerType = 4;
        [SerializeField] private float spawnX = 18f;
        [SerializeField] private float minInterval = 1.5f;
        [SerializeField] private float maxInterval = 3.5f;

        private Dictionary<int, Queue<GameObject>> pools;
        private float nextSpawnTime;

        private void Start()
        {
            pools = new Dictionary<int, Queue<GameObject>>();
            for (int i = 0; i < obstacles.Length; i++)
            {
                pools[i] = new Queue<GameObject>();
                for (int j = 0; j < poolSizePerType; j++)
                {
                    var obj = Instantiate(obstacles[i].prefab);
                    obj.SetActive(false);
                    pools[i].Enqueue(obj);
                }
            }
            nextSpawnTime = 2f;
        }

        private void Update()
        {
            if (GameManager.Instance?.State != Core.GameState.Playing) return;
            if (Time.time < nextSpawnTime) return;

            SpawnNext();
            nextSpawnTime = Time.time + Random.Range(minInterval, maxInterval);
        }

        private void SpawnNext()
        {
            int idx = WeightedRandom();
            if (idx < 0) return;

            var pool = pools[idx];
            GameObject obj = pool.Dequeue();
            obj.transform.position = new Vector3(spawnX, obstacles[idx].prefab.transform.position.y, 0f);
            obj.SetActive(true);

            var scroll = obj.GetComponent<ScrollingObject>() ?? obj.AddComponent<ScrollingObject>();
            var recycler = obj.GetComponent<ObstacleRecycler>() ?? obj.AddComponent<ObstacleRecycler>();
            recycler.Init(pool, -spawnX - 2f);

            pool.Enqueue(obj);
        }

        private int WeightedRandom()
        {
            float total = 0f;
            foreach (var o in obstacles) total += o.weight;
            float roll = Random.Range(0f, total);
            float cumulative = 0f;
            for (int i = 0; i < obstacles.Length; i++)
            {
                cumulative += obstacles[i].weight;
                if (roll <= cumulative) return i;
            }
            return obstacles.Length - 1;
        }
    }

    /// <summary>Auto-disables obstacle when it scrolls past the left edge.</summary>
    public class ObstacleRecycler : MonoBehaviour
    {
        private Queue<GameObject> returnPool;
        private float recycleX;

        public void Init(Queue<GameObject> pool, float atX)
        {
            returnPool = pool;
            recycleX = atX;
        }

        private void Update()
        {
            if (transform.position.x < recycleX)
                gameObject.SetActive(false);
        }
    }
}
