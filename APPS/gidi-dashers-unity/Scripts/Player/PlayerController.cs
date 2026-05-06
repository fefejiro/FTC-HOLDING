using UnityEngine;

namespace GidiDashers.Player
{
    /// <summary>
    /// Handles jump, double-jump, and slide.
    /// Input: tap/click = jump, swipe down / hold = slide.
    /// Works with both touch and mouse (for editor testing).
    /// </summary>
    [RequireComponent(typeof(Rigidbody2D), typeof(Animator))]
    public class PlayerController : MonoBehaviour
    {
        [Header("Jump")]
        [SerializeField] private float jumpForce = 14f;
        [SerializeField] private float doubleJumpForce = 11f;
        [SerializeField] private LayerMask groundLayer;

        [Header("Slide")]
        [SerializeField] private float slideDuration = 0.6f;
        [SerializeField] private Collider2D standCollider;
        [SerializeField] private Collider2D slideCollider;

        private Rigidbody2D rb;
        private Animator animator;
        private bool isGrounded;
        private bool hasDoubleJump;
        private bool isSliding;
        private float slideTimer;

        private static readonly int AnimJump   = Animator.StringToHash("jump");
        private static readonly int AnimSlide  = Animator.StringToHash("slide");
        private static readonly int AnimDead   = Animator.StringToHash("dead");
        private static readonly int AnimGround = Animator.StringToHash("grounded");

        private Vector2 touchStart;

        private void Awake()
        {
            rb = GetComponent<Rigidbody2D>();
            animator = GetComponent<Animator>();
        }

        private void OnEnable()
        {
            GameManager.OnStateChanged += OnStateChanged;
        }

        private void OnDisable()
        {
            GameManager.OnStateChanged -= OnStateChanged;
        }

        private void Update()
        {
            if (GameManager.Instance?.State != Core.GameState.Playing) return;

            CheckGrounded();
            HandleSlideTimer();
            HandleInput();
        }

        private void CheckGrounded()
        {
            var hit = Physics2D.Raycast(transform.position, Vector2.down, 0.15f, groundLayer);
            isGrounded = hit.collider != null;
            if (isGrounded) hasDoubleJump = true;
            animator.SetBool(AnimGround, isGrounded);
        }

        private void HandleSlideTimer()
        {
            if (!isSliding) return;
            slideTimer -= Time.deltaTime;
            if (slideTimer <= 0f) EndSlide();
        }

        private void HandleInput()
        {
            // Touch input
            if (Input.touchCount > 0)
            {
                Touch t = Input.GetTouch(0);
                if (t.phase == TouchPhase.Began) touchStart = t.position;
                if (t.phase == TouchPhase.Ended)
                {
                    Vector2 delta = t.position - touchStart;
                    if (delta.y < -80f && Mathf.Abs(delta.x) < Mathf.Abs(delta.y))
                        StartSlide();
                    else
                        TryJump();
                }
            }

            // Mouse fallback (editor)
#if UNITY_EDITOR
            if (Input.GetMouseButtonDown(0)) TryJump();
            if (Input.GetKeyDown(KeyCode.DownArrow)) StartSlide();
#endif
        }

        private void TryJump()
        {
            if (isSliding) { EndSlide(); return; }
            if (isGrounded)
            {
                rb.linearVelocity = new Vector2(rb.linearVelocity.x, jumpForce);
                animator.SetTrigger(AnimJump);
            }
            else if (hasDoubleJump)
            {
                hasDoubleJump = false;
                rb.linearVelocity = new Vector2(rb.linearVelocity.x, doubleJumpForce);
                animator.SetTrigger(AnimJump);
            }
        }

        private void StartSlide()
        {
            if (!isGrounded || isSliding) return;
            isSliding = true;
            slideTimer = slideDuration;
            standCollider.enabled = false;
            slideCollider.enabled = true;
            animator.SetBool(AnimSlide, true);
        }

        private void EndSlide()
        {
            isSliding = false;
            standCollider.enabled = true;
            slideCollider.enabled = false;
            animator.SetBool(AnimSlide, false);
        }

        private void OnTriggerEnter2D(Collider2D other)
        {
            if (!other.CompareTag("Obstacle")) return;
            GameManager.Instance.GameOver();
        }

        private void OnStateChanged(Core.GameState state)
        {
            if (state == Core.GameState.Dead)
                animator.SetTrigger(AnimDead);
        }
    }
}
