using UnityEngine;

namespace GidiDashers.World
{
    /// <summary>
    /// Coin pickup — spawned along the track, collected on trigger.
    /// Awards score bonus and plays coin SFX.
    /// </summary>
    [RequireComponent(typeof(Collider2D))]
    public class CoinPickup : MonoBehaviour
    {
        [SerializeField] private float scoreBonus = 50f;
        [SerializeField] private float bobAmplitude = 0.15f;
        [SerializeField] private float bobSpeed = 2.5f;

        private Vector3 startPos;

        private void OnEnable()
        {
            startPos = transform.localPosition;
        }

        private void Update()
        {
            // Gentle vertical bob
            transform.localPosition = startPos + Vector3.up
                * Mathf.Sin(Time.time * bobSpeed) * bobAmplitude;
        }

        private void OnTriggerEnter2D(Collider2D other)
        {
            if (!other.CompareTag("Player")) return;
            Audio.AudioManager.Instance?.PlayCoin();
            // Score bonus is handled via GameManager — quick event approach
            GameManager.Instance?.AddBonusScore(scoreBonus);
            gameObject.SetActive(false);
        }
    }
}
