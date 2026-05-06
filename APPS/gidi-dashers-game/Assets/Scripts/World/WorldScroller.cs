using UnityEngine;
using GidiDashers.Core;

namespace GidiDashers.World
{
    /// <summary>
    /// Moves the world backwards to simulate the player running forward.
    /// Also handles difficulty speed ramps.
    /// </summary>
    public class WorldScroller : MonoBehaviour
    {
        public static WorldScroller Instance { get; private set; }

        [Header("Speed")]
        [SerializeField] private float startSpeed = 8f;
        [SerializeField] private float maxSpeed = 22f;
        [SerializeField] private float speedIncrement = 1.2f;

        public float CurrentSpeed { get; private set; }

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
            CurrentSpeed = startSpeed;
        }

        private void Update()
        {
            if (GameManager.Instance == null) return;
            if (GameManager.Instance.State != GameState.Playing) return;

            // Move all active scrollable objects
            foreach (var obj in ScrollingObject.ActiveObjects)
                obj.Scroll(CurrentSpeed * Time.deltaTime);
        }

        public void RampSpeed()
        {
            CurrentSpeed = Mathf.Min(CurrentSpeed + speedIncrement, maxSpeed);
        }

        public void ResetSpeed()
        {
            CurrentSpeed = startSpeed;
        }
    }
}
