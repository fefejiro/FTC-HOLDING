using UnityEngine;

namespace GidiDashers.World
{
    /// <summary>
    /// Parallax background layer — scrolls at a fraction of world speed
    /// to give depth. Works with any SpriteRenderer using tiling.
    /// </summary>
    [RequireComponent(typeof(SpriteRenderer))]
    public class ParallaxLayer : MonoBehaviour
    {
        [SerializeField, Range(0f, 1f)]
        private float parallaxFactor = 0.3f; // 0 = static sky, 1 = full world speed

        private SpriteRenderer sr;
        private float spriteWidth;

        private void Awake()
        {
            sr = GetComponent<SpriteRenderer>();
            spriteWidth = sr.bounds.size.x;
        }

        private void Update()
        {
            if (GameManager.Instance?.State != Core.GameState.Playing) return;

            float scrollAmount = WorldScroller.Instance.CurrentSpeed
                               * parallaxFactor
                               * Time.deltaTime;

            transform.position += Vector3.left * scrollAmount;

            // Wrap sprite when it scrolls fully off-screen to the left
            if (transform.position.x <= -spriteWidth)
                transform.position += Vector3.right * spriteWidth * 2f;
        }
    }
}
