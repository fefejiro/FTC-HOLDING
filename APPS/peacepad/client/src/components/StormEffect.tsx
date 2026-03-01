
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface StormEffectProps {
  intensity: 'light' | 'medium' | 'heavy';
  isActive: boolean;
}

export function StormEffect({ intensity, isActive }: StormEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showLightning, setShowLightning] = useState(false);

  // Rain intensity settings
  const getRainConfig = () => {
    switch (intensity) {
      case 'light':
        return { dropCount: 50, speed: 2, opacity: 0.3 };
      case 'medium':
        return { dropCount: 100, speed: 3, opacity: 0.5 };
      case 'heavy':
        return { dropCount: 200, speed: 4, opacity: 0.7 };
    }
  };

  useEffect(() => {
    if (!isActive || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const config = getRainConfig();
    const drops: Array<{ x: number; y: number; length: number; speed: number }> = [];

    // Initialize raindrops
    for (let i = 0; i < config.dropCount; i++) {
      drops.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        length: Math.random() * 20 + 10,
        speed: Math.random() * config.speed + config.speed,
      });
    }

    // Lightning flash effect (for heavy storms)
    const triggerLightning = () => {
      if (intensity === 'heavy' && Math.random() < 0.02) {
        setShowLightning(true);
        setTimeout(() => setShowLightning(false), 100);
      }
    };

    // Animation loop
    let animationId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw rain
      ctx.strokeStyle = `rgba(174, 194, 224, ${config.opacity})`;
      ctx.lineWidth = 1;

      drops.forEach((drop) => {
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x, drop.y + drop.length);
        ctx.stroke();

        // Update position
        drop.y += drop.speed;
        drop.x += 0.5; // Slight diagonal movement

        // Reset drop when it falls off screen
        if (drop.y > canvas.height) {
          drop.y = -drop.length;
          drop.x = Math.random() * canvas.width;
        }
      });

      triggerLightning();
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [isActive, intensity]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* Rain canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />

      {/* Lightning flash */}
      <AnimatePresence>
        {showLightning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="absolute inset-0 bg-white"
          />
        )}
      </AnimatePresence>

      {/* Storm overlay gradient */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-slate-900/20 via-slate-700/10 to-transparent"
        style={{
          opacity: intensity === 'heavy' ? 0.5 : intensity === 'medium' ? 0.3 : 0.2,
        }}
      />

      {/* Ambient sound indicator */}
      <motion.div 
        className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md text-white px-5 py-3 rounded-full text-sm flex items-center gap-3 shadow-lg border border-white/10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <motion.span 
          className="text-xl"
          animate={{ 
            scale: intensity === 'heavy' ? [1, 1.2, 1] : 1,
          }}
          transition={{ 
            duration: 2,
            repeat: intensity === 'heavy' ? Infinity : 0,
          }}
        >
          {intensity === 'heavy' ? '⛈️' : intensity === 'medium' ? '🌧️' : '🌦️'}
        </motion.span>
        <div className="flex flex-col">
          <span className="font-semibold">
            {intensity === 'heavy' ? 'High Tension' : 
             intensity === 'medium' ? 'Moderate Tension' : 
             'Low Tension'}
          </span>
          <span className="text-xs opacity-75">
            {intensity === 'heavy' ? 'Take a breathing break' : 
             intensity === 'medium' ? 'Stay mindful of emotions' : 
             'Emotions are rising'}
          </span>
        </div>
      </motion.div>
    </div>
  );
}
