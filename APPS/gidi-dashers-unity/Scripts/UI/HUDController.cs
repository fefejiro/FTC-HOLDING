using UnityEngine;
using UnityEngine.UI;
using TMPro;
using GidiDashers.Core;

namespace GidiDashers.UI
{
    public class HUDController : MonoBehaviour
    {
        [Header("Score")]
        [SerializeField] private TextMeshProUGUI scoreText;
        [SerializeField] private TextMeshProUGUI highScoreText;

        [Header("Panels")]
        [SerializeField] private GameObject menuPanel;
        [SerializeField] private GameObject hudPanel;
        [SerializeField] private GameObject pausePanel;
        [SerializeField] private GameObject gameOverPanel;

        [Header("Game Over")]
        [SerializeField] private TextMeshProUGUI finalScoreText;
        [SerializeField] private TextMeshProUGUI newHighScoreLabel;

        private int lastHighScore;

        private void OnEnable()
        {
            GameManager.OnStateChanged += OnStateChanged;
            GameManager.OnScoreChanged += OnScoreChanged;
        }

        private void OnDisable()
        {
            GameManager.OnStateChanged -= OnStateChanged;
            GameManager.OnScoreChanged -= OnScoreChanged;
        }

        private void Start()
        {
            lastHighScore = GameManager.Instance?.HighScore ?? 0;
            ShowMenu();
        }

        private void OnStateChanged(GameState state)
        {
            menuPanel.SetActive(state == GameState.Menu);
            hudPanel.SetActive(state == GameState.Playing);
            pausePanel.SetActive(state == GameState.Paused);
            gameOverPanel.SetActive(state == GameState.Dead);

            if (state == GameState.Dead)
            {
                int score = Mathf.RoundToInt(GameManager.Instance.Score);
                finalScoreText.text = score.ToString("N0");
                bool newRecord = score > lastHighScore;
                newHighScoreLabel.gameObject.SetActive(newRecord);
                if (newRecord)
                {
                    lastHighScore = score;
                    highScoreText.text = "Best: " + score.ToString("N0");
                }
            }

            if (state == GameState.Playing)
                highScoreText.text = "Best: " + GameManager.Instance.HighScore.ToString("N0");
        }

        private void OnScoreChanged(float score)
        {
            scoreText.text = Mathf.RoundToInt(score).ToString("N0");
        }

        private void ShowMenu()
        {
            menuPanel.SetActive(true);
            hudPanel.SetActive(false);
            pausePanel.SetActive(false);
            gameOverPanel.SetActive(false);
        }

        // Button callbacks
        public void OnPlayPressed()     => GameManager.Instance.StartGame();
        public void OnPausePressed()    => GameManager.Instance.PauseGame();
        public void OnResumePressed()   => GameManager.Instance.ResumeGame();
        public void OnRestartPressed()  => GameManager.Instance.RestartGame();
        public void OnMenuPressed()     => GameManager.Instance.GoToMenu();
    }
}
