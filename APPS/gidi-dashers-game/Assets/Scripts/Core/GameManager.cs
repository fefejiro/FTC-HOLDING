using UnityEngine;
using UnityEngine.SceneManagement;
using GidiDashers.World;

namespace GidiDashers.Core
{
    public class GameManager : MonoBehaviour
    {
        public static GameManager Instance { get; private set; }

        [Header("Game State")]
        public GameState State { get; private set; } = GameState.Menu;

        [Header("Score")]
        [SerializeField] private float scoreMultiplier = 1f;
        [SerializeField] private float difficultyRampInterval = 10f; // seconds

        public float Score { get; private set; }
        public int HighScore { get; private set; }
        public float GameTime { get; private set; }

        private float nextRampTime;

        public static event System.Action<GameState> OnStateChanged;
        public static event System.Action<float> OnScoreChanged;
        public static event System.Action<float> OnSpeedChanged;

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
            DontDestroyOnLoad(gameObject);
            HighScore = PlayerPrefs.GetInt("HighScore", 0);
        }

        private void Update()
        {
            if (State != GameState.Playing) return;

            GameTime += Time.deltaTime;
            Score += Time.deltaTime * scoreMultiplier * WorldScroller.Instance.CurrentSpeed;
            OnScoreChanged?.Invoke(Score);

            if (GameTime >= nextRampTime)
            {
                nextRampTime = GameTime + difficultyRampInterval;
                WorldScroller.Instance.RampSpeed();
                OnSpeedChanged?.Invoke(WorldScroller.Instance.CurrentSpeed);
            }
        }

        public void StartGame()
        {
            Score = 0;
            GameTime = 0;
            nextRampTime = difficultyRampInterval;
            SetState(GameState.Playing);
        }

        public void PauseGame()
        {
            if (State != GameState.Playing) return;
            Time.timeScale = 0f;
            SetState(GameState.Paused);
        }

        public void ResumeGame()
        {
            if (State != GameState.Paused) return;
            Time.timeScale = 1f;
            SetState(GameState.Playing);
        }

        public void AddBonusScore(float bonus)
        {
            if (State != GameState.Playing) return;
            Score += bonus;
            OnScoreChanged?.Invoke(Score);
        }

        public void GameOver()
        {
            if (State == GameState.Dead) return;
            Time.timeScale = 0f;
            SetState(GameState.Dead);

            if (Score > HighScore)
            {
                HighScore = Mathf.RoundToInt(Score);
                PlayerPrefs.SetInt("HighScore", HighScore);
                PlayerPrefs.Save();
            }
        }

        public void RestartGame()
        {
            Time.timeScale = 1f;
            SceneManager.LoadScene(SceneManager.GetActiveScene().buildIndex);
        }

        public void GoToMenu()
        {
            Time.timeScale = 1f;
            SceneManager.LoadScene(0);
        }

        private void SetState(GameState newState)
        {
            State = newState;
            OnStateChanged?.Invoke(newState);
        }
    }

    public enum GameState { Menu, Playing, Paused, Dead }
}
