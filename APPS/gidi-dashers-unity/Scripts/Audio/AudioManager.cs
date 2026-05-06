using UnityEngine;

namespace GidiDashers.Audio
{
    /// <summary>
    /// Simple audio manager for SFX + looping music.
    /// Uses AudioSource pooling — no extra packages needed.
    /// Afrobeats / Afropop BGM loops. SFX: jump, slide, coin, death.
    /// </summary>
    public class AudioManager : MonoBehaviour
    {
        public static AudioManager Instance { get; private set; }

        [Header("Music")]
        [SerializeField] private AudioClip menuMusic;
        [SerializeField] private AudioClip gameMusic;
        [SerializeField, Range(0f, 1f)] private float musicVolume = 0.55f;

        [Header("SFX")]
        [SerializeField] private AudioClip jumpSFX;
        [SerializeField] private AudioClip slideSFX;
        [SerializeField] private AudioClip coinSFX;
        [SerializeField] private AudioClip deathSFX;
        [SerializeField, Range(0f, 1f)] private float sfxVolume = 0.8f;

        private AudioSource musicSource;
        private AudioSource sfxSource;

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
            DontDestroyOnLoad(gameObject);

            musicSource = gameObject.AddComponent<AudioSource>();
            musicSource.loop = true;
            musicSource.volume = musicVolume;

            sfxSource = gameObject.AddComponent<AudioSource>();
            sfxSource.volume = sfxVolume;
        }

        private void OnEnable()  => GameManager.OnStateChanged += OnStateChanged;
        private void OnDisable() => GameManager.OnStateChanged -= OnStateChanged;

        private void OnStateChanged(Core.GameState state)
        {
            switch (state)
            {
                case Core.GameState.Menu:    PlayMusic(menuMusic); break;
                case Core.GameState.Playing: PlayMusic(gameMusic);  break;
                case Core.GameState.Dead:    PlaySFX(deathSFX);    break;
            }
        }

        public void PlayJump()  => PlaySFX(jumpSFX);
        public void PlaySlide() => PlaySFX(slideSFX);
        public void PlayCoin()  => PlaySFX(coinSFX);

        private void PlayMusic(AudioClip clip)
        {
            if (clip == null || musicSource.clip == clip) return;
            musicSource.clip = clip;
            musicSource.Play();
        }

        private void PlaySFX(AudioClip clip)
        {
            if (clip == null) return;
            sfxSource.PlayOneShot(clip, sfxVolume);
        }
    }
}
