using System.Collections.Generic;
using UnityEngine;
using GidiDashers.Core;

namespace GidiDashers.World
{
    /// <summary>
    /// Spawns coin rows in random patterns. Coins are pooled and re-used.
    /// Pattern types: straight line, arc, zigzag.
    /// </summary>
    public class CoinSpawner : MonoBehaviour
    {
        [SerializeField] private GameObject coinPrefab;
        [SerializeField] private int poolSize = 30;
        [SerializeField] private float spawnX = 20f;
        [SerializeField] private float groundY = 1.2f;
        [SerializeField] private float minInterval = 3f;
        [SerializeField] private float maxInterval = 7f;

        private Queue<GameObject> pool = new Queue<GameObject>();
        private float nextSpawnTime;

        private void Start()
        {
            for (int i = 0; i < poolSize; i++)
            {
                var c = Instantiate(coinPrefab);
                c.SetActive(false);
                c.AddComponent<ScrollingObject>();
                pool.Enqueue(c);
            }
            nextSpawnTime = 3f;
        }

        private void Update()
        {
            if (GameManager.Instance?.State != GameState.Playing) return;
            if (Time.time < nextSpawnTime) return;

            SpawnPattern();
            nextSpawnTime = Time.time + Random.Range(minInterval, maxInterval);
        }

        private void SpawnPattern()
        {
            int pattern = Random.Range(0, 3);
            switch (pattern)
            {
                case 0: SpawnLine(5); break;
                case 1: SpawnArc(6);  break;
                case 2: SpawnZigzag(4); break;
            }
        }

        private void SpawnLine(int count)
        {
            float spacing = 1.1f;
            for (int i = 0; i < count; i++)
                PlaceCoin(spawnX + i * spacing, groundY);
        }

        private void SpawnArc(int count)
        {
            float spacing = 1.1f;
            for (int i = 0; i < count; i++)
            {
                float y = groundY + Mathf.Sin(i / (float)(count - 1) * Mathf.PI) * 2f;
                PlaceCoin(spawnX + i * spacing, y);
            }
        }

        private void SpawnZigzag(int count)
        {
            float spacing = 1.3f;
            for (int i = 0; i < count; i++)
                PlaceCoin(spawnX + i * spacing, groundY + (i % 2 == 0 ? 0f : 1.6f));
        }

        private void PlaceCoin(float x, float y)
        {
            if (pool.Count == 0) return;
            var coin = pool.Dequeue();
            coin.transform.position = new Vector3(x, y, 0f);
            coin.SetActive(true);
            pool.Enqueue(coin);
        }
    }
}
