using System;
using System.Collections.Generic;
using UnityEngine;

namespace Jci.Presentation
{
    /// <summary>
    /// A self-contained, offline prompt game. It intentionally stores no player
    /// data and uses no services: a family can pass the device around, draw a
    /// prompt, talk, and move to the next turn.
    /// </summary>
    public sealed class JustCheckingInGame : MonoBehaviour
    {
        private const string Background = "#102A43";
        private const string Card = "#F7F1E5";
        private const string Ink = "#102A43";
        private const string Coral = "#E76F51";
        private const string Teal = "#2A9D8F";
        private const string Gold = "#E9C46A";

        private readonly List<Prompt> prompts = new List<Prompt>
        {
            new Prompt("Today", "What is one word that describes how you feel right now?"),
            new Prompt("Small win", "What is something you did well this week?"),
            new Prompt("Connection", "Who helped you recently, and how did it make a difference?"),
            new Prompt("Kindness", "What is one kind thing you could do for someone today?"),
            new Prompt("Energy", "What gives you energy when your day feels busy?"),
            new Prompt("Gratitude", "What is one ordinary thing you are grateful for?"),
            new Prompt("Listen", "What would you like someone to understand about you today?"),
            new Prompt("Hope", "What is one thing you are looking forward to?"),
            new Prompt("Support", "When do you feel most supported by other people?"),
            new Prompt("Pause", "What would make the rest of today feel a little better?"),
            new Prompt("Memory", "Share a moment that made you smile recently."),
            new Prompt("Brave", "What is something new you would like to try?"),
        };

        private Texture2D colourTexture;
        private GUIStyle titleStyle;
        private GUIStyle eyebrowStyle;
        private GUIStyle bodyStyle;
        private GUIStyle cardLabelStyle;
        private GUIStyle cardTitleStyle;
        private GUIStyle cardBodyStyle;
        private GUIStyle buttonStyle;
        private GUIStyle secondaryButtonStyle;
        private int promptIndex;
        private bool hasPrompt;
        private int turns;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void Create()
        {
            if (FindAnyObjectByType<JustCheckingInGame>() != null)
            {
                return;
            }

            var gameObject = new GameObject("Just Checking In Game");
            DontDestroyOnLoad(gameObject);
            gameObject.AddComponent<JustCheckingInGame>();
        }

        private void Awake()
        {
            Application.targetFrameRate = 60;
            Screen.sleepTimeout = SleepTimeout.NeverSleep;
            colourTexture = new Texture2D(1, 1, TextureFormat.RGBA32, false);
            colourTexture.SetPixel(0, 0, Color.white);
            colourTexture.Apply();
            promptIndex = UnityEngine.Random.Range(0, prompts.Count);
        }

        private void OnDestroy()
        {
            if (colourTexture != null)
            {
                Destroy(colourTexture);
            }
        }

        private void OnGUI()
        {
            EnsureStyles();
            var width = Screen.width;
            var height = Screen.height;
            var horizontal = Mathf.Max(30f, width * 0.065f);
            var top = Mathf.Max(42f, height * 0.07f);
            var contentWidth = width - (horizontal * 2f);

            DrawRect(new Rect(0, 0, width, height), Parse(Background));
            DrawCircle(new Vector2(width * 0.86f, height * 0.1f), width * 0.28f, Parse("#173D5C"));
            DrawCircle(new Vector2(width * 0.1f, height * 0.9f), width * 0.20f, Parse("#173D5C"));

            GUI.Label(new Rect(horizontal, top, contentWidth, 34), "JUST CHECKING IN", eyebrowStyle);
            GUI.Label(new Rect(horizontal, top + 46, contentWidth, 112), "A little time\nto connect.", titleStyle);

            if (!hasPrompt)
            {
                DrawWelcome(horizontal, top + 205, contentWidth, height);
                return;
            }

            DrawPrompt(horizontal, top + 205, contentWidth, height);
        }

        private void DrawWelcome(float horizontal, float top, float contentWidth, float height)
        {
            GUI.Label(
                new Rect(horizontal, top, contentWidth, 115),
                "Take turns. Draw a prompt. Make room for the conversation that matters.",
                bodyStyle);

            var cardTop = top + 155;
            DrawRoundedCard(new Rect(horizontal, cardTop, contentWidth, Mathf.Min(225f, height * 0.25f)), Parse(Card));
            GUI.Label(new Rect(horizontal + 30, cardTop + 30, contentWidth - 60, 35), "HOW TO PLAY", cardLabelStyle);
            GUI.Label(
                new Rect(horizontal + 30, cardTop + 75, contentWidth - 60, 120),
                "1. Pass the device to the next player.\n2. Draw a prompt and take your time.\n3. Listen without fixing. Then pass it on.",
                cardBodyStyle);

            var buttonTop = Mathf.Min(height - 130f, cardTop + 270f);
            if (GUI.Button(new Rect(horizontal, buttonTop, contentWidth, 64), "Start checking in", buttonStyle))
            {
                hasPrompt = true;
                turns = 1;
            }
        }

        private void DrawPrompt(float horizontal, float top, float contentWidth, float height)
        {
            GUI.Label(new Rect(horizontal, top, contentWidth, 30), $"TURN {turns:00}", eyebrowStyle);
            var cardTop = top + 44;
            var cardHeight = Mathf.Min(340f, height * 0.42f);
            DrawRoundedCard(new Rect(horizontal, cardTop, contentWidth, cardHeight), Parse(Card));

            var prompt = prompts[promptIndex];
            GUI.Label(new Rect(horizontal + 30, cardTop + 32, contentWidth - 60, 34), prompt.Category.ToUpperInvariant(), cardLabelStyle);
            GUI.Label(new Rect(horizontal + 30, cardTop + 86, contentWidth - 60, cardHeight - 125), prompt.Text, cardTitleStyle);

            var buttonTop = cardTop + cardHeight + 30;
            if (GUI.Button(new Rect(horizontal, buttonTop, contentWidth, 64), "Next prompt", buttonStyle))
            {
                DrawNextPrompt();
            }

            if (GUI.Button(new Rect(horizontal, buttonTop + 80, contentWidth, 52), "Pass this one", secondaryButtonStyle))
            {
                DrawNextPrompt();
            }

            GUI.Label(new Rect(horizontal, height - 48, contentWidth, 28), "There is no score. Listening is the win.", eyebrowStyle);
        }

        private void DrawNextPrompt()
        {
            var next = UnityEngine.Random.Range(0, prompts.Count - 1);
            if (next >= promptIndex)
            {
                next++;
            }

            promptIndex = next;
            turns++;
        }

        private void EnsureStyles()
        {
            if (titleStyle != null)
            {
                return;
            }

            titleStyle = new GUIStyle(GUI.skin.label)
            {
                fontStyle = FontStyle.Bold,
                fontSize = Mathf.Clamp(Mathf.RoundToInt(Screen.width * 0.09f), 28, 58),
                wordWrap = true,
                alignment = TextAnchor.UpperLeft,
                normal = { textColor = Color.white },
            };
            eyebrowStyle = new GUIStyle(GUI.skin.label)
            {
                fontStyle = FontStyle.Bold,
                fontSize = Mathf.Clamp(Mathf.RoundToInt(Screen.width * 0.035f), 13, 21),
                wordWrap = true,
                alignment = TextAnchor.UpperLeft,
                normal = { textColor = Parse(Gold) },
            };
            bodyStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = Mathf.Clamp(Mathf.RoundToInt(Screen.width * 0.046f), 17, 27),
                wordWrap = true,
                alignment = TextAnchor.UpperLeft,
                normal = { textColor = Color.white },
            };
            cardLabelStyle = new GUIStyle(eyebrowStyle)
            {
                normal = { textColor = Parse(Coral) },
            };
            cardTitleStyle = new GUIStyle(titleStyle)
            {
                normal = { textColor = Parse(Ink) },
            };
            cardBodyStyle = new GUIStyle(bodyStyle)
            {
                normal = { textColor = Parse(Ink) },
            };
            buttonStyle = new GUIStyle(GUI.skin.button)
            {
                fontStyle = FontStyle.Bold,
                fontSize = Mathf.Clamp(Mathf.RoundToInt(Screen.width * 0.048f), 17, 27),
                alignment = TextAnchor.MiddleCenter,
                normal = { textColor = Color.white, background = MakeTexture(Parse(Coral)) },
                hover = { textColor = Color.white, background = MakeTexture(Parse("#D6573B")) },
                active = { textColor = Color.white, background = MakeTexture(Parse("#C94D33")) },
            };
            secondaryButtonStyle = new GUIStyle(buttonStyle)
            {
                normal = { textColor = Parse(Card), background = MakeTexture(Parse(Background)) },
                hover = { textColor = Parse(Card), background = MakeTexture(Parse("#173D5C")) },
                active = { textColor = Parse(Card), background = MakeTexture(Parse("#173D5C")) },
            };
        }

        private void DrawRoundedCard(Rect rect, Color color)
        {
            DrawRect(rect, color);
            DrawRect(new Rect(rect.x, rect.y, 7, rect.height), Parse(Teal));
        }

        private void DrawRect(Rect rect, Color color)
        {
            var previous = GUI.color;
            GUI.color = color;
            GUI.DrawTexture(rect, colourTexture);
            GUI.color = previous;
        }

        private void DrawCircle(Vector2 centre, float radius, Color color)
        {
            const int steps = 36;
            var points = new Vector3[steps + 1];
            for (var i = 0; i <= steps; i++)
            {
                var angle = i * Mathf.PI * 2f / steps;
                points[i] = new Vector3(centre.x + Mathf.Cos(angle) * radius, centre.y + Mathf.Sin(angle) * radius, 0);
            }

            var previous = GUI.color;
            GUI.color = color;
            for (var i = 0; i < steps; i++)
            {
                DrawLine(points[i], points[i + 1], 2f);
            }
            GUI.color = previous;
        }

        private static void DrawLine(Vector3 from, Vector3 to, float width)
        {
            var delta = to - from;
            var angle = Mathf.Atan2(delta.y, delta.x) * Mathf.Rad2Deg;
            GUIUtility.RotateAroundPivot(angle, from);
            GUI.DrawTexture(new Rect(from.x, from.y, delta.magnitude, width), Texture2D.whiteTexture);
            GUIUtility.RotateAroundPivot(-angle, from);
        }

        private Texture2D MakeTexture(Color color)
        {
            var texture = new Texture2D(1, 1, TextureFormat.RGBA32, false);
            texture.SetPixel(0, 0, color);
            texture.Apply();
            return texture;
        }

        private static Color Parse(string html)
        {
            ColorUtility.TryParseHtmlString(html, out var colour);
            return colour;
        }

        private readonly struct Prompt
        {
            public Prompt(string category, string text)
            {
                Category = category;
                Text = text;
            }

            public string Category { get; }
            public string Text { get; }
        }
    }
}
