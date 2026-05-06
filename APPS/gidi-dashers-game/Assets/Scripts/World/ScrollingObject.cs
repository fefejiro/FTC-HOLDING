using System.Collections.Generic;
using UnityEngine;

namespace GidiDashers.World
{
    /// <summary>
    /// Attach to any object that should scroll left with the world.
    /// Registers itself so WorldScroller can drive it.
    /// </summary>
    public class ScrollingObject : MonoBehaviour
    {
        public static readonly List<ScrollingObject> ActiveObjects = new List<ScrollingObject>();

        private void OnEnable()  => ActiveObjects.Add(this);
        private void OnDisable() => ActiveObjects.Remove(this);

        public void Scroll(float delta)
        {
            transform.position += Vector3.left * delta;
        }
    }
}
