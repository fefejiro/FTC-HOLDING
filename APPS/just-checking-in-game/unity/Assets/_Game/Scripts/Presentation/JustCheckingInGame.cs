using System;
using System.IO;
using Jci.Application;
using Jci.Domain;
using Jci.Infrastructure;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace Jci.Presentation
{
    /// <summary>Offline-first uGUI shell. Only documented local IDs and metrics are persisted.</summary>
    public sealed class JustCheckingInGame : MonoBehaviour
    {
        private const string Background = "#F3E8D5";
        private const string Card = "#FFF9F0";
        private const string Ink = "#15354D";
        private const string Coral = "#E49A73";
        private const string Teal = "#78B7AD";
        private const string Gold = "#D1A84F";

        private Canvas canvas;
        private RectTransform body;
        private InputField nameInput;
        private JciLocalStore store;
        private JciStoreDocument document;
        private JciSoloSession solo;
        private JciTogetherSession together;
        private MoodOption selectedMood;
        private Sprite sunLogo;
        private Sprite warmBackdrop;
        private Sprite cardFront;
        private Sprite cardBack;
        private Sprite roundedSurface;
        private Button startTogetherButton;
#if UNITY_ANDROID && !UNITY_EDITOR
        private AndroidJavaClass androidBackBridge;
        private AndroidJavaObject androidActivity;
        private volatile bool androidBackRequested;
#endif

        private enum JciScreen
        {
            Home,
            SelfMood,
            SelfCard,
            SelfSummary,
            TogetherPicker,
            TogetherActive,
            TogetherPassPhone,
            TogetherSummary,
            Journey
        }

        private JciScreen currentScreen = JciScreen.Home;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void Create()
        {
            if (FindAnyObjectByType<JustCheckingInGame>() != null) return;
            var go = new GameObject("Just Checking In Game");
            DontDestroyOnLoad(go);
            go.AddComponent<JustCheckingInGame>();
        }

        private void Awake()
        {
            UnityEngine.Application.targetFrameRate = 60;
            Screen.sleepTimeout = SleepTimeout.NeverSleep;
#if UNITY_ANDROID && !UNITY_EDITOR
            // Keep Android's status/navigation bars available so notification shade,
            // gesture navigation, and system back remain usable alongside JCI.
            Screen.fullScreenMode = FullScreenMode.Windowed;
            Screen.fullScreen = false;
#endif
            store = new JciLocalStore(Path.Combine(UnityEngine.Application.persistentDataPath, "jci-local-v1.json"));
            document = store.Load();
            sunLogo = LoadSprite("JciSunLogo");
            warmBackdrop = LoadSprite("JciWarmBackdrop");
            cardFront = LoadSprite("JciCardFront");
            cardBack = LoadSprite("JciCardBack");
            roundedSurface = CreateRoundedRectSprite();
            BuildCanvas();
            ShowHome();
#if UNITY_ANDROID && !UNITY_EDITOR
            RegisterAndroidBackCallback();
#endif
        }

        private void OnEnable()
        {
            UnityEngine.Application.wantsToQuit += OnWantsToQuit;
        }

        private void OnDisable()
        {
            UnityEngine.Application.wantsToQuit -= OnWantsToQuit;
#if UNITY_ANDROID && !UNITY_EDITOR
            UnregisterAndroidBackCallback();
#endif
        }

        private void Update()
        {
#if UNITY_ANDROID && !UNITY_EDITOR
            if (androidBackRequested)
            {
                androidBackRequested = false;
                HandleBack();
            }
#endif
        }

        private bool OnWantsToQuit()
        {
            if (currentScreen == JciScreen.Home) return true;
            HandleBack();
            return false;
        }

#if UNITY_ANDROID && !UNITY_EDITOR
        private void RegisterAndroidBackCallback()
        {
            try
            {
                using (var version = new AndroidJavaClass("android.os.Build$VERSION"))
                {
                    if (version.GetStatic<int>("SDK_INT") < 33) return;
                }

                using (var unityPlayer = new AndroidJavaClass("com.unity3d.player.UnityPlayer"))
                {
                    androidActivity = unityPlayer.GetStatic<AndroidJavaObject>("currentActivity");
                }

                androidBackBridge = new AndroidJavaClass("com.ftcholding.justcheckingin.JciBackBridge");
                androidBackBridge.CallStatic("register", androidActivity);
                UnityEngine.Debug.Log("JCI Android back callback registered");
            }
            catch (Exception error)
            {
                UnityEngine.Debug.LogWarning("JCI Android back callback unavailable: " + error.Message);
            }
        }

        private void UnregisterAndroidBackCallback()
        {
            if (androidBackBridge == null || androidActivity == null) return;
            try
            {
                androidBackBridge.CallStatic("unregister", androidActivity);
            }
            catch (Exception error)
            {
                UnityEngine.Debug.LogWarning("JCI Android back callback cleanup: " + error.Message);
            }
            androidBackBridge.Dispose();
            androidActivity.Dispose();
            androidBackBridge = null;
            androidActivity = null;
        }

        public void OnAndroidBackInvoked(string message)
        {
            androidBackRequested = true;
        }
#endif

        private void HandleBack()
        {
            switch (currentScreen)
            {
                case JciScreen.Home:
                    UnityEngine.Application.Quit();
                    break;
                case JciScreen.TogetherPicker:
                case JciScreen.Journey:
                    ShowHome();
                    break;
                case JciScreen.SelfMood:
                    ShowHome();
                    break;
                case JciScreen.SelfCard:
                    ShowSelfMood();
                    break;
                case JciScreen.SelfSummary:
                case JciScreen.TogetherSummary:
                    ShowHome();
                    break;
                case JciScreen.TogetherActive:
                case JciScreen.TogetherPassPhone:
                    if (together != null && together.Phase == SessionPhase.Active)
                    {
                        document.ActiveSession = together.Snapshot();
                        store.Save(document);
                    }
                    ShowHome();
                    break;
            }
        }

        private void OnApplicationPause(bool paused)
        {
            if (!paused) return;
            if (together != null && together.Phase == SessionPhase.Active)
            {
                document.ActiveSession = together.Snapshot();
                store.Save(document);
            }
            if (solo != null && solo.Phase == SessionPhase.Active)
            {
                document.ActiveSelfSession = solo.Snapshot();
                store.Save(document);
            }
        }

        private void OnApplicationFocus(bool focused)
        {
            if (!focused) OnApplicationPause(true);
        }

        private void BuildCanvas()
        {
            // The runtime UI is created entirely in code, so create the event
            // system explicitly; without it, buttons render but never receive
            // touch/pointer input on Android or iOS.
            if (FindAnyObjectByType<EventSystem>() == null)
            {
                var eventSystem = new GameObject("JCI EventSystem", typeof(EventSystem));
                eventSystem.transform.SetParent(transform, false);
                eventSystem.AddComponent<StandaloneInputModule>();
            }

            var go = new GameObject("JCI Canvas", typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
            go.transform.SetParent(transform, false);
            canvas = go.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 10;
            var scaler = go.GetComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(390, 844);
            scaler.screenMatchMode = CanvasScaler.ScreenMatchMode.MatchWidthOrHeight;
            scaler.matchWidthOrHeight = 0.5f;
            var background = MakePanel(go.transform, "Background", Parse(Background));
            var backgroundImage = background.GetComponent<Image>();
            if (warmBackdrop != null)
            {
                backgroundImage.sprite = warmBackdrop;
                backgroundImage.preserveAspect = false;
                backgroundImage.color = new Color(1f, 1f, 1f, 0.94f);
            }
            Stretch(background);
            var safe = new GameObject("Safe Area", typeof(RectTransform), typeof(JciSafeArea));
            safe.transform.SetParent(go.transform, false);
            Stretch(safe.GetComponent<RectTransform>());
            var glass = MakePanel(safe.transform, "Glass Surface", new Color(1f, 1f, 1f, 0.10f));
            var glassImage = glass.GetComponent<Image>();
            glassImage.sprite = roundedSurface;
            glassImage.type = Image.Type.Sliced;
            Stretch(glass);
            glass.offsetMin = new Vector2(14, 12);
            glass.offsetMax = new Vector2(-14, -12);
            var outline = glass.gameObject.AddComponent<Outline>();
            outline.effectColor = new Color(1f, 1f, 1f, 0.12f);
            outline.effectDistance = new Vector2(1f, -1f);
            glass.gameObject.AddComponent<JciGlassPulse>();
            body = MakePanel(safe.transform, "Body", new Color(0, 0, 0, 0));
            Stretch(body);
            body.offsetMin = new Vector2(26, 24);
            body.offsetMax = new Vector2(-26, -24);
            var layout = body.gameObject.AddComponent<VerticalLayoutGroup>();
            layout.spacing = 9;
            layout.padding = new RectOffset(0, 0, 0, 0);
            layout.childControlWidth = true;
            layout.childControlHeight = false;
            layout.childForceExpandWidth = true;
            layout.childForceExpandHeight = false;
        }

        private void ClearBody()
        {
            for (var i = body.childCount - 1; i >= 0; i--) Destroy(body.GetChild(i).gameObject);
            var motion = body.GetComponent<JciScreenMotion>() ?? body.gameObject.AddComponent<JciScreenMotion>();
            motion.Play();
            AddBrandHeader(body);
            var hero = AddText(body, "Just Checking In", 32, Parse(Ink), FontStyle.Bold, 70);
            hero.rectTransform.sizeDelta = new Vector2(0, 70);
        }

        private void ShowHome()
        {
            currentScreen = JciScreen.Home;
            ClearBody();
            AddText(body, "How would you like to check in?", 18, Parse(Ink), FontStyle.Normal, 43);
            if (document.ActiveSession != null || document.ActiveSelfSession != null) AddButton(body, "Resume your check-in", ResumeActiveSession, Parse(Coral));
            AddPhysicalDeck(body);
        }

        private void ShowSelfMood()
        {
            currentScreen = JciScreen.SelfMood;
            selectedMood = null;
            ClearBody();
            AddText(body, "Solo check-in", 25, Parse(Ink), FontStyle.Bold, 48);
            AddCardText(body, "How are you feeling today?", 23, 126, Parse(Teal));
            foreach (var mood in JciContent.Moods) AddButton(body, mood.Label, () => SelectMood(mood), Parse(Teal));
            AddButton(body, "Back", ShowHome, Parse(Card), Parse(Ink));
        }

        private void SelectMood(MoodOption mood)
        {
            selectedMood = mood;
            solo = new JciSoloSession(JciContent.PromptsForMood(mood.Id), unchecked((int)DateTime.UtcNow.Ticks));
            solo.Start(mood.Id, DateTime.UtcNow.Ticks);
            document.ActiveSelfSession = solo.Snapshot();
            store.Save(document);
            ShowSelfCard();
        }

        private void ShowSelfCard()
        {
            currentScreen = JciScreen.SelfCard;
            ClearBody();
            if (solo == null || solo.CurrentPrompt == null) { ShowSelfMood(); return; }
            AddText(body, "Your card", 25, Parse(Ink), FontStyle.Bold, 48);
            AddText(body, "A quiet prompt for this moment.", 16, new Color(Parse(Ink).r, Parse(Ink).g, Parse(Ink).b, .76f), FontStyle.Normal, 36);
            AddPromptCard(body, solo.CurrentPrompt, Parse(Teal));
            AddButton(body, "Draw another card", DrawAnotherSelf, Parse(Teal));
            AddButton(body, "Skip this one", SkipSelf, Parse(Gold), Parse(Ink));
            AddButton(body, "End check-in", EndSelf, Parse(Card), Parse(Ink));
        }

        private void DrawAnotherSelf() { if (solo == null) return; solo.DrawAnother(); SaveSelfAndShowCard(); }
        private void SkipSelf() { if (solo == null) return; solo.SkipCurrent(); SaveSelfAndShowCard(); }
        private void SaveSelfAndShowCard() { document.ActiveSelfSession = solo.Snapshot(); store.Save(document); Haptic(); ShowSelfCard(); }

        private void EndSelf()
        {
            if (solo == null || selectedMood == null) return;
            var record = solo.End(DateTime.UtcNow.Ticks, Guid.NewGuid().ToString("N"));
            document.SelfCheckIns.Add(record);
            document.ActiveSelfSession = null;
            store.Save(document);
            Haptic();
            currentScreen = JciScreen.SelfSummary;
            ClearBody();
            AddText(body, "You made a little space for yourself.", 25, Parse(Ink), FontStyle.Bold, 70);
            AddCardText(body, record.CardsSeen + " cards drawn · " + record.CardsSkipped + " skipped", 20, 112, Parse(Teal));
            AddText(body, "Take what is useful and leave the rest.", 17, Parse(Ink), FontStyle.Normal, 46);
            AddButton(body, "Return home", ShowHome, Parse(Teal));
        }

        private void ShowTogetherPicker()
        {
            currentScreen = JciScreen.TogetherPicker;
            ClearBody();
            AddText(body, "Together", 25, Parse(Ink), FontStyle.Bold, 48);
            AddCardText(body, "Who are you checking in with?", 22, 126, Parse(Coral));
            foreach (var connection in document.Connections)
            {
                var local = connection;
                AddButton(body, local.DisplayName, () => StartTogether(local.Id), Parse(Teal));
            }
            nameInput = AddInput(body, "Name or nickname");
            startTogetherButton = AddButton(body, "Start your check-in", CreateAndStartTogether, Parse(Coral));
            startTogetherButton.interactable = false;
            nameInput.onValueChanged.AddListener(value => UpdateTogetherStartState(value));
            nameInput.onEndEdit.AddListener(value => UpdateTogetherStartState(value));
            AddButton(body, "Back", ShowHome, Parse(Card), Parse(Ink));
        }

        private void UpdateTogetherStartState(string value)
        {
            if (startTogetherButton != null) startTogetherButton.interactable = !string.IsNullOrWhiteSpace(value == null ? string.Empty : value.Trim());
        }

        private void CreateAndStartTogether()
        {
            var name = nameInput == null ? string.Empty : nameInput.text.Trim();
            if (name.Length == 0) return;
            var connection = new LocalConnection(Guid.NewGuid().ToString("N"), name, DateTime.UtcNow.Ticks);
            document.Connections.Add(connection);
            store.Save(document);
            StartTogether(connection.Id);
        }

        private void StartTogether(string connectionId)
        {
            together = new JciTogetherSession(JciContent.TogetherPrompts(), unchecked((int)DateTime.UtcNow.Ticks));
            together.Start(connectionId, DateTime.UtcNow.Ticks);
            document.ActiveSession = together.Snapshot();
            store.Save(document);
            ShowTogether();
        }

        private void ResumeActiveSession()
        {
            if (document.ActiveSelfSession != null)
            {
                try
                {
                    var promptSource = JciContent.PromptsForMood(document.ActiveSelfSession.MoodId);
                    solo = new JciSoloSession(promptSource, unchecked((int)DateTime.UtcNow.Ticks));
                    solo.Restore(document.ActiveSelfSession);
                    selectedMood = FindMood(document.ActiveSelfSession.MoodId);
                    ShowSelfCard();
                    return;
                }
                catch (ArgumentException) { document.ActiveSelfSession = null; store.Save(document); }
            }

            if (document.ActiveSession != null) ResumeTogether();
            else ShowHome();
        }

        private static MoodOption FindMood(string id)
        {
            for (var i = 0; i < JciContent.Moods.Length; i++) if (JciContent.Moods[i].Id == id) return JciContent.Moods[i];
            return null;
        }

        private void ResumeTogether()
        {
            try
            {
                    together = new JciTogetherSession(JciContent.TogetherPrompts(), unchecked((int)DateTime.UtcNow.Ticks));
                together.Restore(document.ActiveSession);
                ShowTogether();
            }
            catch (ArgumentException)
            {
                // A stale pre-release snapshot must never leave a dead Resume button on Home.
                document.ActiveSession = null;
                store.Save(document);
                together = null;
                ShowHome();
            }
        }

        private void ShowTogether()
        {
            currentScreen = JciScreen.TogetherActive;
            ClearBody();
            if (together == null || together.CurrentPrompt == null) { ShowHome(); return; }
            AddText(body, CurrentTurnLabel(), 25, Parse(Ink), FontStyle.Bold, 48);
            AddPromptCard(body, together.CurrentPrompt, Parse(Coral));
            AddButton(body, "Next card", CompleteTurn, Parse(Coral));
            AddButton(body, "Skip this one", PassTurn, Parse(Teal));
            AddButton(body, "End check-in", EndTogether, Parse(Card), Parse(Ink));
        }

        private void CompleteTurn() { together.CompleteCurrent(); SaveActiveAndRefresh(); }
        private void PassTurn() { together.PassCurrent(); SaveActiveAndRefresh(); }

        private void SaveActiveAndRefresh()
        {
            document.ActiveSession = together.Snapshot();
            store.Save(document);
            Haptic();
            ShowPassPhone();
        }

        private void ShowPassPhone()
        {
            currentScreen = JciScreen.TogetherPassPhone;
            ClearBody();
            var handoff = together.TurnNumber % 2 == 1 ? "Pass the phone back to you." : "Pass the phone to " + ConnectionDisplayName() + ".";
            AddCardText(body, handoff, 24, 164, Parse(Coral));
            AddText(body, "The next card stays hidden until they are ready.", 17, Parse(Ink), FontStyle.Normal, 58);
            AddButton(body, "I'm ready", ShowTogether, Parse(Teal));
            AddButton(body, "End check-in", EndTogether, Parse(Card), Parse(Ink));
        }

        private string CurrentTurnLabel()
        {
            if (together == null || together.TurnNumber % 2 == 1) return "Your turn";
            return ConnectionDisplayName() + "'s turn";
        }

        private string ConnectionDisplayName()
        {
            if (together == null) return "your partner";
            for (var i = 0; i < document.Connections.Count; i++)
            {
                var connection = document.Connections[i];
                if (string.Equals(connection.Id, together.ConnectionId, StringComparison.Ordinal) && !string.IsNullOrWhiteSpace(connection.DisplayName))
                {
                    return connection.DisplayName;
                }
            }

            return "your partner";
        }

        private void EndTogether()
        {
            var summary = together.End(DateTime.UtcNow.Ticks, Guid.NewGuid().ToString("N"));
            document.TogetherSessions.Add(summary);
            document.ActiveSession = null;
            store.Save(document);
            Haptic();
            currentScreen = JciScreen.TogetherSummary;
            ClearBody();
            AddText(body, "That was a good pause.", 26, Parse(Ink), FontStyle.Bold, 70);
            AddCardText(body, summary.QuestionsCompleted + " shared · " + summary.QuestionsPassed + " skipped", 19, 92, Parse(Gold));
            AddButton(body, "Return home", ShowHome, Parse(Teal));
        }

        private void ShowJourney()
        {
            currentScreen = JciScreen.Journey;
            ClearBody();
            AddCardText(body, "Your local connection journey", 22, 112, Parse(Gold));
            foreach (var connection in document.Connections)
            {
                var local = connection;
                var count = document.TogetherSessions.FindAll(s => s.ConnectionId == local.Id).Count;
                AddButton(body, local.DisplayName + " - " + count + " check-ins", () => DeleteConnection(local), Parse(Teal));
            }
            AddText(body, "Tap a name to remove its local label. Nothing leaves this device.", 13, new Color(0.08f, 0.16f, 0.24f, .72f), FontStyle.Normal, 58);
            AddButton(body, "Add someone", ShowTogetherPicker, Parse(Coral));
            AddButton(body, "Reset all local data", ResetLocalData, Parse(Coral));
            AddButton(body, "Back", ShowHome, Parse(Card), Parse(Ink));
        }

        private void DeleteConnection(LocalConnection connection)
        {
            document.Connections.Remove(connection);
            store.Save(document);
            ShowJourney();
        }

        private void ResetLocalData()
        {
            store.DeleteAll();
            document = new JciStoreDocument();
            solo = null;
            together = null;
            ShowHome();
        }

        private void Haptic()
        {
#if (UNITY_IOS || UNITY_ANDROID) && !UNITY_EDITOR
            Handheld.Vibrate();
#endif
        }

        private static RectTransform MakePanel(Transform parent, string name, Color color)
        {
            var go = new GameObject(name, typeof(RectTransform), typeof(Image));
            go.transform.SetParent(parent, false);
            go.GetComponent<Image>().color = color;
            return go.GetComponent<RectTransform>();
        }

        private static void Stretch(RectTransform rect)
        {
            rect.anchorMin = Vector2.zero; rect.anchorMax = Vector2.one; rect.offsetMin = Vector2.zero; rect.offsetMax = Vector2.zero;
        }

        private static Sprite LoadSprite(string resourceName)
        {
            var texture = Resources.Load<Texture2D>(resourceName);
            if (texture == null) return null;
            return Sprite.Create(texture, new Rect(0, 0, texture.width, texture.height), new Vector2(.5f, .5f), 100f);
        }

        private static void AddBrandHeader(Transform parent)
        {
            var go = new GameObject("Brand header", typeof(RectTransform), typeof(HorizontalLayoutGroup), typeof(LayoutElement));
            go.transform.SetParent(parent, false);
            var rect = go.GetComponent<RectTransform>();
            rect.anchorMin = new Vector2(0, 1); rect.anchorMax = new Vector2(1, 1); rect.pivot = new Vector2(.5f, 1); rect.sizeDelta = new Vector2(0, 44);
            var layoutElement = go.GetComponent<LayoutElement>(); layoutElement.preferredHeight = 44; layoutElement.flexibleWidth = 1;
            var layout = go.GetComponent<HorizontalLayoutGroup>();
            layout.spacing = 10; layout.childAlignment = TextAnchor.MiddleLeft; layout.childControlWidth = false; layout.childControlHeight = false; layout.childForceExpandWidth = false; layout.childForceExpandHeight = false;

            var logoMaskGo = new GameObject("Sunrise mark", typeof(RectTransform), typeof(Image), typeof(Mask), typeof(LayoutElement));
            logoMaskGo.transform.SetParent(go.transform, false);
            var logoRect = logoMaskGo.GetComponent<RectTransform>(); logoRect.sizeDelta = new Vector2(44, 44);
            var logoMaskImage = logoMaskGo.GetComponent<Image>(); logoMaskImage.sprite = CreateCircleSprite(); logoMaskImage.color = Color.white; logoMaskImage.raycastTarget = false;
            logoMaskGo.GetComponent<Mask>().showMaskGraphic = false;
            var logoGo = new GameObject("Sunrise artwork", typeof(RectTransform), typeof(Image));
            logoGo.transform.SetParent(logoMaskGo.transform, false);
            var logoArtworkRect = logoGo.GetComponent<RectTransform>(); Stretch(logoArtworkRect); logoArtworkRect.offsetMin = new Vector2(-1, -1); logoArtworkRect.offsetMax = new Vector2(1, 1);
            var logoImage = logoGo.GetComponent<Image>(); logoImage.sprite = LoadSprite("JciSunLogoTransparent"); logoImage.preserveAspect = true; logoImage.raycastTarget = false;
            var logoLayout = logoMaskGo.GetComponent<LayoutElement>(); logoLayout.preferredWidth = 44; logoLayout.preferredHeight = 44;
            var label = AddText(go.transform, "JUST CHECKING IN", 15, Parse(Ink), FontStyle.Bold, 44);
            label.rectTransform.sizeDelta = new Vector2(190, 44);
            var labelLayout = label.GetComponent<LayoutElement>(); if (labelLayout != null) labelLayout.preferredWidth = 190;
        }

        private void AddPhysicalDeck(Transform parent)
        {
            var area = new GameObject("Physical card deck", typeof(RectTransform), typeof(LayoutElement));
            area.transform.SetParent(parent, false);
            var areaRect = area.GetComponent<RectTransform>();
            areaRect.anchorMin = new Vector2(0, 1); areaRect.anchorMax = new Vector2(1, 1); areaRect.pivot = new Vector2(.5f, 1); areaRect.sizeDelta = new Vector2(0, 446);
            var areaLayout = area.GetComponent<LayoutElement>(); areaLayout.preferredHeight = 446; areaLayout.minHeight = 330; areaLayout.flexibleWidth = 1;
            var layout = area.AddComponent<VerticalLayoutGroup>();
            layout.spacing = 12; layout.padding = new RectOffset(0, 0, 4, 4); layout.childAlignment = TextAnchor.UpperCenter;
            layout.childControlWidth = true; layout.childControlHeight = false; layout.childForceExpandWidth = true; layout.childForceExpandHeight = false;

            AddPhysicalModeCard(area.transform, "Check in with myself", "A quiet moment for you", ShowSelfMood, Parse(Teal));
            AddPhysicalModeCard(area.transform, "Check in together", "Share a moment with someone", ShowTogetherPicker, Parse(Coral));
            AddPhysicalModeCard(area.transform, "Your connection journey", "See your local moments", ShowJourney, Parse(Gold));
        }

        private static void AddDeckImage(Transform parent, Sprite sprite, Vector2 position, Vector2 size, float angle, float alpha)
        {
            if (sprite == null) return;
            var go = new GameObject("Card deck layer", typeof(RectTransform), typeof(Image));
            go.transform.SetParent(parent, false);
            var rect = go.GetComponent<RectTransform>(); rect.anchorMin = new Vector2(.5f, .5f); rect.anchorMax = new Vector2(.5f, .5f); rect.pivot = new Vector2(.5f, .5f); rect.anchoredPosition = position; rect.sizeDelta = size; rect.localRotation = Quaternion.Euler(0, 0, angle);
            var image = go.GetComponent<Image>(); image.sprite = sprite; image.preserveAspect = true; image.raycastTarget = false; image.color = new Color(1f, 1f, 1f, alpha);
            var shadow = go.AddComponent<Shadow>(); shadow.effectColor = new Color(.08f, .12f, .16f, .18f); shadow.effectDistance = new Vector2(0, -4);
        }

        private static Text AddText(Transform parent, string value, int size, Color color, FontStyle style, float height, Color? background = null)
        {
            value = NormalizeLabel(value);
            RectTransform layoutRect = null;
            if (background.HasValue)
            {
                var card = new GameObject("Text card", typeof(RectTransform), typeof(Image), typeof(LayoutElement));
                card.transform.SetParent(parent, false);
                card.GetComponent<Image>().color = background.Value;
                var outline = card.AddComponent<Outline>();
                outline.effectColor = new Color(1f, 1f, 1f, 0.16f);
                outline.effectDistance = new Vector2(1f, -1f);
                var shadow = card.AddComponent<Shadow>();
                shadow.effectColor = new Color(0.08f, 0.12f, 0.16f, 0.16f);
                shadow.effectDistance = new Vector2(0f, -4f);
                layoutRect = card.GetComponent<RectTransform>();
                layoutRect.anchorMin = new Vector2(0, 1); layoutRect.anchorMax = new Vector2(1, 1); layoutRect.pivot = new Vector2(0, 1); layoutRect.sizeDelta = new Vector2(0, height);
                var cardLayout = card.GetComponent<LayoutElement>(); cardLayout.preferredHeight = height; cardLayout.flexibleWidth = 1;
                parent = card.transform;
            }

            var go = new GameObject("Text", typeof(RectTransform), typeof(Text));
            go.transform.SetParent(parent, false);
            var text = go.GetComponent<Text>();
            text.text = value; text.font = LoadDisplayFont(); text.fontSize = size; text.fontStyle = style; text.color = color;
            text.alignment = TextAnchor.MiddleLeft; text.horizontalOverflow = HorizontalWrapMode.Wrap; text.verticalOverflow = VerticalWrapMode.Overflow; text.raycastTarget = false;
            var rect = text.rectTransform;
            if (layoutRect != null)
            {
                rect.anchorMin = Vector2.zero; rect.anchorMax = Vector2.one; rect.offsetMin = new Vector2(18, 12); rect.offsetMax = new Vector2(-18, -12);
            }
            else
            {
                rect.anchorMin = new Vector2(0, 1); rect.anchorMax = new Vector2(1, 1); rect.pivot = new Vector2(0, 1); rect.sizeDelta = new Vector2(0, height);
                var layout = text.gameObject.AddComponent<LayoutElement>(); layout.preferredHeight = height; layout.flexibleWidth = 1;
            }
            return text;
        }

        private Text AddCardText(Transform parent, string value, int size, float height, Color accent)
        {
            var go = new GameObject("Physical prompt card", typeof(RectTransform), typeof(Image), typeof(LayoutElement));
            go.transform.SetParent(parent, false);
            var rect = go.GetComponent<RectTransform>();
            rect.anchorMin = new Vector2(0, 1); rect.anchorMax = new Vector2(1, 1); rect.pivot = new Vector2(.5f, 1); rect.sizeDelta = new Vector2(0, height);
            var layout = go.GetComponent<LayoutElement>(); layout.preferredHeight = height; layout.minHeight = height; layout.flexibleWidth = 1;
            var image = go.GetComponent<Image>();
            image.sprite = cardFront;
            image.preserveAspect = false;
            image.color = Color.Lerp(Color.white, accent, .08f);
            var outline = go.AddComponent<Outline>(); outline.effectColor = new Color(1f, 1f, 1f, .55f); outline.effectDistance = new Vector2(1f, -1f);
            var shadow = go.AddComponent<Shadow>(); shadow.effectColor = new Color(.08f, .12f, .16f, .22f); shadow.effectDistance = new Vector2(0f, -5f);
            go.AddComponent<JciCardMotion>();
            var accentLine = new GameObject("Card accent", typeof(RectTransform), typeof(Image));
            accentLine.transform.SetParent(go.transform, false);
            var accentRect = accentLine.GetComponent<RectTransform>(); accentRect.anchorMin = new Vector2(.5f, 1); accentRect.anchorMax = new Vector2(.5f, 1); accentRect.pivot = new Vector2(.5f, 1); accentRect.anchoredPosition = new Vector2(0, -18); accentRect.sizeDelta = new Vector2(46, 5);
            accentLine.GetComponent<Image>().color = accent; accentLine.GetComponent<Image>().raycastTarget = false;
            var text = AddText(go.transform, value, size, Parse(Ink), FontStyle.Bold, height);
            text.alignment = TextAnchor.MiddleCenter;
            text.rectTransform.anchorMin = Vector2.zero; text.rectTransform.anchorMax = Vector2.one;
            text.rectTransform.offsetMin = new Vector2(20, 18); text.rectTransform.offsetMax = new Vector2(-20, -18);
            return text;
        }

        private Text AddPromptCard(Transform parent, PromptCard prompt, Color accent)
        {
            var go = new GameObject("Prompt card", typeof(RectTransform), typeof(Image), typeof(LayoutElement));
            go.transform.SetParent(parent, false);
            var rect = go.GetComponent<RectTransform>();
            rect.anchorMin = new Vector2(0, 1); rect.anchorMax = new Vector2(1, 1); rect.pivot = new Vector2(.5f, 1); rect.sizeDelta = new Vector2(0, 286);
            var layout = go.GetComponent<LayoutElement>(); layout.preferredHeight = 286; layout.minHeight = 230; layout.flexibleWidth = 1;
            var image = go.GetComponent<Image>(); image.sprite = cardFront; image.preserveAspect = false; image.color = Color.Lerp(Color.white, accent, .07f);
            var outline = go.AddComponent<Outline>(); outline.effectColor = new Color(1f, 1f, 1f, .65f); outline.effectDistance = new Vector2(1f, -1f);
            var shadow = go.AddComponent<Shadow>(); shadow.effectColor = new Color(.08f, .12f, .16f, .24f); shadow.effectDistance = new Vector2(0f, -6f);
            go.AddComponent<JciCardMotion>();
            var category = AddText(go.transform, prompt.Category, 14, accent, FontStyle.Bold, 34);
            category.alignment = TextAnchor.MiddleCenter; category.rectTransform.anchorMin = new Vector2(0, .72f); category.rectTransform.anchorMax = new Vector2(1, .88f); category.rectTransform.offsetMin = new Vector2(20, 0); category.rectTransform.offsetMax = new Vector2(-20, 0);
            var text = AddText(go.transform, prompt.Text, prompt.Kind == PromptKind.Affirmation ? 25 : 23, Parse(Ink), FontStyle.Bold, 178);
            text.alignment = TextAnchor.MiddleCenter; text.rectTransform.anchorMin = new Vector2(0, .18f); text.rectTransform.anchorMax = new Vector2(1, .74f); text.rectTransform.offsetMin = new Vector2(28, 0); text.rectTransform.offsetMax = new Vector2(-28, 0);
            var ornament = AddText(go.transform, prompt.Kind == PromptKind.Affirmation ? "✦" : "✧", 24, accent, FontStyle.Normal, 30);
            ornament.alignment = TextAnchor.MiddleCenter; ornament.rectTransform.anchorMin = new Vector2(0, .06f); ornament.rectTransform.anchorMax = new Vector2(1, .18f); ornament.rectTransform.offsetMin = Vector2.zero; ornament.rectTransform.offsetMax = Vector2.zero;
            return text;
        }

        // Keep labels readable if an older serialized/source string contains UTF-8 mojibake.
        private static string NormalizeLabel(string value)
        {
            return (value ?? string.Empty)
                .Replace("\u00C2\u00B7", "\u00B7")
                .Replace("\u00E2\u20AC\u201D", "\u2014");
        }

        private Button AddButton(Transform parent, string label, UnityEngine.Events.UnityAction action, Color background, Color? foreground = null)
        {
            var go = new GameObject(label, typeof(RectTransform), typeof(Image), typeof(Button));
            go.transform.SetParent(parent, false);
            var rect = go.GetComponent<RectTransform>(); rect.anchorMin = new Vector2(0, 1); rect.anchorMax = new Vector2(1, 1); rect.pivot = new Vector2(.5f, 1); rect.sizeDelta = new Vector2(0, 58);
            var layout = go.AddComponent<LayoutElement>(); layout.preferredHeight = 58; layout.flexibleWidth = 1;
            var image = go.GetComponent<Image>(); image.color = background; image.sprite = roundedSurface; image.type = Image.Type.Sliced;
            var outline = go.AddComponent<Outline>(); outline.effectColor = new Color(1f, 1f, 1f, .32f); outline.effectDistance = new Vector2(1f, -1f);
            var shadow = go.AddComponent<Shadow>(); shadow.effectColor = new Color(.08f, .12f, .16f, .18f); shadow.effectDistance = new Vector2(0f, -3f);
            var button = go.GetComponent<Button>(); button.onClick.AddListener(action);
            button.transition = Selectable.Transition.ColorTint;
            var colors = button.colors;
            colors.normalColor = background;
            colors.highlightedColor = Color.Lerp(background, Color.white, 0.10f);
            colors.pressedColor = Color.Lerp(background, Color.black, 0.08f);
            colors.selectedColor = colors.highlightedColor;
            colors.disabledColor = new Color(background.r, background.g, background.b, 0.45f);
            button.colors = colors;
            go.AddComponent<JciButtonMotion>();
            AddGloss(go.transform, roundedSurface);
            var text = AddText(go.transform, label, 17, foreground ?? Color.white, FontStyle.Bold, 58); text.alignment = TextAnchor.MiddleCenter; text.rectTransform.anchorMin = Vector2.zero; text.rectTransform.anchorMax = Vector2.one; text.rectTransform.offsetMin = new Vector2(12, 0); text.rectTransform.offsetMax = new Vector2(-12, 0);
            return button;
        }

        private Button AddPhysicalModeCard(Transform parent, string title, string subtitle, UnityEngine.Events.UnityAction action, Color accent)
        {
            var go = new GameObject(title, typeof(RectTransform), typeof(Image), typeof(Button), typeof(LayoutElement));
            go.transform.SetParent(parent, false);
            var rect = go.GetComponent<RectTransform>();
            rect.anchorMin = new Vector2(0, 1); rect.anchorMax = new Vector2(1, 1); rect.pivot = new Vector2(.5f, 1); rect.sizeDelta = new Vector2(0, 132);

            var layout = go.GetComponent<LayoutElement>();
            layout.preferredHeight = 132; layout.minHeight = 116; layout.flexibleWidth = 1;

            var image = go.GetComponent<Image>();
            image.sprite = cardFront;
            image.preserveAspect = false;
            image.color = Color.Lerp(Color.white, accent, .10f);
            var outline = go.AddComponent<Outline>();
            outline.effectColor = new Color(1f, 1f, 1f, 0.40f); outline.effectDistance = new Vector2(1f, -1f);
            var shadow = go.AddComponent<Shadow>();
            shadow.effectColor = new Color(0.08f, 0.12f, 0.16f, 0.25f); shadow.effectDistance = new Vector2(0f, -5f);

            var button = go.GetComponent<Button>();
            button.onClick.AddListener(action);
            button.transition = Selectable.Transition.ColorTint;
            var colors = button.colors;
            var normal = Color.Lerp(Color.white, accent, .10f);
            colors.normalColor = normal; colors.highlightedColor = Color.Lerp(normal, Color.white, 0.12f); colors.pressedColor = Color.Lerp(normal, Color.black, 0.08f);
            colors.selectedColor = colors.highlightedColor;
            colors.disabledColor = new Color(normal.r, normal.g, normal.b, 0.45f);
            button.colors = colors;
            go.AddComponent<JciCardMotion>();
            go.AddComponent<JciButtonMotion>();

            var badge = new GameObject("Card accent", typeof(RectTransform), typeof(Image));
            badge.transform.SetParent(go.transform, false);
            var badgeRect = badge.GetComponent<RectTransform>(); badgeRect.anchorMin = new Vector2(.5f, 1); badgeRect.anchorMax = new Vector2(.5f, 1); badgeRect.pivot = new Vector2(.5f, 1); badgeRect.anchoredPosition = new Vector2(0, -15); badgeRect.sizeDelta = new Vector2(48, 4);
            badge.GetComponent<Image>().color = accent; badge.GetComponent<Image>().raycastTarget = false;
            var titleText = AddText(go.transform, title, 19, Parse(Ink), FontStyle.Bold, 64); titleText.alignment = TextAnchor.MiddleCenter; titleText.horizontalOverflow = HorizontalWrapMode.Wrap; titleText.verticalOverflow = VerticalWrapMode.Truncate; titleText.rectTransform.anchorMin = new Vector2(0, .36f); titleText.rectTransform.anchorMax = new Vector2(1, .82f); titleText.rectTransform.offsetMin = new Vector2(20, 0); titleText.rectTransform.offsetMax = new Vector2(-20, 0);
            var subtitleText = AddText(go.transform, subtitle, 14, new Color(Parse(Ink).r, Parse(Ink).g, Parse(Ink).b, .82f), FontStyle.Normal, 40); subtitleText.alignment = TextAnchor.MiddleCenter; subtitleText.horizontalOverflow = HorizontalWrapMode.Wrap; subtitleText.verticalOverflow = VerticalWrapMode.Truncate; subtitleText.rectTransform.anchorMin = new Vector2(0, .10f); subtitleText.rectTransform.anchorMax = new Vector2(1, .34f); subtitleText.rectTransform.offsetMin = new Vector2(20, 0); subtitleText.rectTransform.offsetMax = new Vector2(-20, 0);
            return button;
        }

        private InputField AddInput(Transform parent, string placeholder)
        {
            var go = new GameObject("Connection name", typeof(RectTransform), typeof(Image), typeof(InputField));
            go.transform.SetParent(parent, false);
            var rect = go.GetComponent<RectTransform>(); rect.anchorMin = new Vector2(0, 1); rect.anchorMax = new Vector2(1, 1); rect.pivot = new Vector2(.5f, 1); rect.sizeDelta = new Vector2(0, 54);
            var layout = go.AddComponent<LayoutElement>(); layout.preferredHeight = 54; layout.flexibleWidth = 1;
            var image = go.GetComponent<Image>(); image.color = Parse(Card); image.sprite = roundedSurface; image.type = Image.Type.Sliced;
            var outline = go.AddComponent<Outline>(); outline.effectColor = new Color(1f, 1f, 1f, .32f); outline.effectDistance = new Vector2(1f, -1f);
            var input = go.GetComponent<InputField>();
            input.lineType = InputField.LineType.SingleLine;
            input.characterLimit = 40;
            input.shouldHideMobileInput = false;
            input.onEndEdit.AddListener(_ => { if (input != null) input.DeactivateInputField(); });
            var text = AddText(go.transform, string.Empty, 17, Parse(Ink), FontStyle.Normal, 54); text.rectTransform.anchorMin = Vector2.zero; text.rectTransform.anchorMax = Vector2.one; text.rectTransform.offsetMin = new Vector2(12, 0); text.rectTransform.offsetMax = new Vector2(-12, 0); input.textComponent = text;
            var hint = AddText(go.transform, placeholder, 16, new Color(.1f, .16f, .26f, .55f), FontStyle.Normal, 54); hint.rectTransform.anchorMin = Vector2.zero; hint.rectTransform.anchorMax = Vector2.one; hint.rectTransform.offsetMin = new Vector2(12, 0); hint.rectTransform.offsetMax = new Vector2(-12, 0); input.placeholder = hint;
            return input;
        }

        private static void AddGloss(Transform parent, Sprite roundedSprite)
        {
            var gloss = new GameObject("Gloss highlight", typeof(RectTransform), typeof(Image));
            gloss.transform.SetParent(parent, false);
            var rect = gloss.GetComponent<RectTransform>();
            rect.anchorMin = new Vector2(0f, .48f); rect.anchorMax = Vector2.one;
            rect.offsetMin = new Vector2(2f, 0f); rect.offsetMax = new Vector2(-2f, -2f);
            var image = gloss.GetComponent<Image>();
            image.sprite = roundedSprite; image.type = Image.Type.Sliced;
            image.color = new Color(1f, 1f, 1f, .13f); image.raycastTarget = false;
        }

        private static Sprite CreateRoundedRectSprite()
        {
            const int size = 64;
            const int radius = 15;
            var texture = new Texture2D(size, size, TextureFormat.RGBA32, false)
            {
                name = "JCI rounded surface",
                filterMode = FilterMode.Bilinear,
                wrapMode = TextureWrapMode.Clamp,
                hideFlags = HideFlags.HideAndDontSave
            };

            var pixels = new Color32[size * size];
            for (var y = 0; y < size; y++)
            {
                for (var x = 0; x < size; x++)
                {
                    var dx = Mathf.Max(0f, Mathf.Max(radius - x, x - (size - 1 - radius)));
                    var dy = Mathf.Max(0f, Mathf.Max(radius - y, y - (size - 1 - radius)));
                    var alpha = (byte)Mathf.RoundToInt(Mathf.Clamp01(radius + .5f - Mathf.Sqrt(dx * dx + dy * dy)) * 255f);
                    pixels[y * size + x] = new Color32(255, 255, 255, alpha);
                }
            }

            texture.SetPixels32(pixels);
            texture.Apply(false, true);
            return Sprite.Create(texture, new Rect(0, 0, size, size), new Vector2(.5f, .5f), 100f, 0, SpriteMeshType.FullRect, new Vector4(radius, radius, radius, radius));
        }

        private static Sprite CreateCircleSprite()
        {
            const int size = 64;
            var texture = new Texture2D(size, size, TextureFormat.RGBA32, false)
            {
                name = "JCI circular logo mask", filterMode = FilterMode.Bilinear, wrapMode = TextureWrapMode.Clamp, hideFlags = HideFlags.HideAndDontSave
            };
            var pixels = new Color32[size * size];
            var center = (size - 1) * .5f;
            var radius = size * .5f - 1f;
            for (var y = 0; y < size; y++) for (var x = 0; x < size; x++)
            {
                var distance = Vector2.Distance(new Vector2(x, y), new Vector2(center, center));
                var alpha = (byte)Mathf.RoundToInt(Mathf.Clamp01(radius + .75f - distance) * 255f);
                pixels[y * size + x] = new Color32(255, 255, 255, alpha);
            }
            texture.SetPixels32(pixels); texture.Apply(false, true);
            return Sprite.Create(texture, new Rect(0, 0, size, size), new Vector2(.5f, .5f), 100f);
        }

        private static Color Parse(string html) { ColorUtility.TryParseHtmlString(html, out var color); return color; }

        private static Font displayFont;
        private static Font LoadDisplayFont()
        {
            if (displayFont != null) return displayFont;
            displayFont = Resources.Load<Font>("DMSans-Variable");
            return displayFont ?? Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        }
    }

    internal sealed class JciSafeArea : MonoBehaviour
    {
        private RectTransform rect; private Rect last;
        private void Awake() { rect = GetComponent<RectTransform>(); Apply(); }
        private void Update() { if (last != Screen.safeArea) Apply(); }
        private void Apply()
        {
            last = Screen.safeArea; var min = last.position; var max = min + last.size;
            rect.anchorMin = new Vector2(min.x / Screen.width, min.y / Screen.height); rect.anchorMax = new Vector2(max.x / Screen.width, max.y / Screen.height); rect.offsetMin = rect.offsetMax = Vector2.zero;
        }
    }

    /// <summary>Short screen fade/scale transition between card states.</summary>
    [UnityEngine.Scripting.Preserve]
    [RequireComponent(typeof(CanvasGroup))]
    internal sealed class JciScreenMotion : MonoBehaviour
    {
        private CanvasGroup group;
        private float elapsed;

        private void Awake()
        {
            group = GetComponent<CanvasGroup>();
        }

        public void Play()
        {
            if (group == null) group = GetComponent<CanvasGroup>();
            if (group == null) return;
            elapsed = 0f;
            group.alpha = 0f;
            transform.localScale = Vector3.one * 0.985f;
            enabled = true;
        }

        private void Update()
        {
            if (group == null) { enabled = false; return; }
            elapsed += Time.unscaledDeltaTime;
            var t = Mathf.Clamp01(elapsed / 0.24f);
            var eased = 1f - Mathf.Pow(1f - t, 3f);
            group.alpha = eased;
            transform.localScale = Vector3.LerpUnclamped(Vector3.one * 0.985f, Vector3.one, eased);
            if (t >= 1f) enabled = false;
        }
    }

    /// <summary>Very low-amplitude glass highlight pulse.</summary>
    [UnityEngine.Scripting.Preserve]
    internal sealed class JciGlassPulse : MonoBehaviour
    {
        private Image image;
        private float elapsed;
        private const float BaseAlpha = 0.11f;

        private void Awake()
        {
            image = GetComponent<Image>();
        }

        private void Update()
        {
            if (image == null) return;
            elapsed += Time.unscaledDeltaTime;
            var color = image.color;
            color.a = BaseAlpha + Mathf.Sin(elapsed * 0.7f) * 0.015f;
            image.color = color;
        }
    }

    /// <summary>A sequenced card-deal entrance that settles and stops.</summary>
    [UnityEngine.Scripting.Preserve]
    internal sealed class JciCardMotion : MonoBehaviour
    {
        private RectTransform rect;
        private float elapsed;
        private float delay;
        private float initialTilt;
        private Vector3 restingScale;

        private void Awake()
        {
            rect = GetComponent<RectTransform>();
            restingScale = rect == null ? Vector3.one : rect.localScale;
            var order = transform.GetSiblingIndex() % 5;
            delay = order * .055f;
            initialTilt = (order % 2 == 0 ? -1f : 1f) * (4f + order);
            rect.localScale = restingScale * .72f;
            rect.localRotation = Quaternion.Euler(0f, 0f, initialTilt);
        }

        private void Update()
        {
            if (rect == null) return;
            elapsed += Time.unscaledDeltaTime;
            var entrance = Mathf.Clamp01((elapsed - delay) / .26f);
            const float overshoot = 1.70158f;
            var easedEntrance = 1f + (overshoot + 1f) * Mathf.Pow(entrance - 1f, 3f) + overshoot * Mathf.Pow(entrance - 1f, 2f);
            var scale = Mathf.Lerp(.72f, 1f, easedEntrance);
            rect.localScale = restingScale * scale;
            rect.localRotation = Quaternion.Euler(0f, 0f, Mathf.Lerp(initialTilt, 0f, Mathf.Clamp01(easedEntrance)));
            if (entrance >= 1f)
            {
                rect.localScale = restingScale;
                rect.localRotation = Quaternion.identity;
                enabled = false;
            }
        }
    }

    /// <summary>Small tactile press response for touch buttons.</summary>
    [UnityEngine.Scripting.Preserve]
    internal sealed class JciButtonMotion : MonoBehaviour, IPointerDownHandler, IPointerUpHandler, IPointerExitHandler
    {
        private RectTransform rect;
        private Vector3 restingScale;

        private void Awake()
        {
            rect = GetComponent<RectTransform>();
        }

        public void OnPointerDown(PointerEventData eventData)
        {
            if (rect == null) return;
            restingScale = rect.localScale;
            rect.localScale = restingScale * 0.965f;
        }

        public void OnPointerUp(PointerEventData eventData) { Restore(); }
        public void OnPointerExit(PointerEventData eventData) { Restore(); }

        private void Restore()
        {
            if (rect != null) rect.localScale = restingScale;
        }
    }
}
