using UnityEditor;
using UnityEditor.Animations;
using UnityEngine;

namespace GidiDashers.Editor
{
    /// <summary>
    /// Menu: Gidi Dashers → Create Player Animator
    /// Creates Assets/Animations/PlayerAnimator.controller with states:
    ///   Idle → Run → Jump → DoubleJump → Slide → Dead
    /// All transitions driven by parameters the PlayerController sets.
    /// </summary>
    public static class AnimatorSetup
    {
        private const string AnimDir = "Assets/Animations";
        private const string ControllerPath = "Assets/Animations/PlayerAnimator.controller";

        [MenuItem("Gidi Dashers/Create Player Animator")]
        public static void CreatePlayerAnimator()
        {
            if (!AssetDatabase.IsValidFolder(AnimDir))
                AssetDatabase.CreateFolder("Assets", "Animations");

            var controller = AnimatorController.CreateAnimatorControllerAtPath(ControllerPath);

            // Parameters — must match Animator.StringToHash() values in PlayerController.cs
            controller.AddParameter("grounded", AnimatorControllerParameterType.Bool);
            controller.AddParameter("slide",    AnimatorControllerParameterType.Bool);
            controller.AddParameter("jump",     AnimatorControllerParameterType.Trigger);
            controller.AddParameter("dead",     AnimatorControllerParameterType.Trigger);

            var layer = controller.layers[0];
            var sm    = layer.stateMachine;

            // States (all use default empty motion — swap sprite animations later)
            var idle  = sm.AddState("Idle");
            var run   = sm.AddState("Run");
            var jump  = sm.AddState("Jump");
            var slide = sm.AddState("Slide");
            var dead  = sm.AddState("Dead");

            sm.defaultState = idle;

            // Idle → Run (grounded and not sliding)
            AddBoolTransition(idle, run,  "grounded", true,  0f);
            // Run → Idle
            AddBoolTransition(run,  idle, "grounded", false, 0f);
            // Any → Jump (trigger)
            AddTriggerTransition(idle,  jump, "jump");
            AddTriggerTransition(run,   jump, "jump");
            AddTriggerTransition(jump,  jump, "jump"); // double jump
            // Jump → Run (grounded)
            AddBoolTransition(jump, run, "grounded", true, 0.05f);
            // Run → Slide
            AddBoolTransition(run,   slide, "slide", true,  0f);
            // Slide → Run
            AddBoolTransition(slide, run,   "slide", false, 0f);
            // Any → Dead (trigger)
            AddTriggerTransition(idle,  dead, "dead");
            AddTriggerTransition(run,   dead, "dead");
            AddTriggerTransition(jump,  dead, "dead");
            AddTriggerTransition(slide, dead, "dead");

            // Commit
            controller.layers = new[] { layer };
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            Debug.Log("[GidiDashers] Player Animator created at " + ControllerPath);
            EditorUtility.DisplayDialog("Animator Created",
                "PlayerAnimator.controller saved to " + ControllerPath +
                "\n\nDrag it onto the Player's Animator component in the Inspector.",
                "OK");
        }

        private static void AddBoolTransition(AnimatorState from, AnimatorState to,
            string param, bool value, float exitTime)
        {
            var t = from.AddTransition(to);
            t.hasExitTime = exitTime > 0f;
            t.exitTime = exitTime;
            t.duration = 0f;
            t.AddCondition(value ? AnimatorConditionMode.If : AnimatorConditionMode.IfNot, 0, param);
        }

        private static void AddTriggerTransition(AnimatorState from, AnimatorState to, string trigger)
        {
            var t = from.AddTransition(to);
            t.hasExitTime = false;
            t.duration = 0f;
            t.AddCondition(AnimatorConditionMode.If, 0, trigger);
        }
    }
}
