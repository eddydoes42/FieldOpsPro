import { useEffect, useRef, useState, useCallback } from 'react';

interface EKGWaveformProps {
  bpm: number;
  status: 'normal' | 'at_risk' | 'delayed' | 'critical';
  severity?: 'none' | 'mild' | 'moderate' | 'severe';
  frequency?: 'occasional' | 'frequent';
  width: number;
  height: number;
  className?: string;
}

interface WaveformPoint {
  x: number;
  y: number;
  time: number;
}

export function EKGWaveform({
  bpm,
  status,
  severity = 'none',
  frequency = 'occasional',
  width,
  height,
  className = ''
}: EKGWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const lastBeatTimeRef = useRef<number>(0);
  const waveformDataRef = useRef<WaveformPoint[]>([]);
  const lastRenderTimeRef = useRef<number>(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  // Calculate beat interval from BPM
  const beatInterval = 60000 / bpm; // milliseconds between beats
  
  // Get waveform color based on status
  const getWaveformColor = useCallback(() => {
    switch (status) {
      case 'normal': return '#10B981'; // green-500
      case 'at_risk': return '#F59E0B'; // yellow-500
      case 'delayed': return '#EF4444'; // red-500
      case 'critical': return '#DC2626'; // red-600
      default: return '#10B981';
    }
  }, [status]);

  // Get background grid color (subtle)
  const getGridColor = () => '#E5E7EB20'; // gray-200 with low opacity

  // Generate EKG beat pattern (P wave, QRS complex, T wave)
  const generateBeatPattern = useCallback((centerX: number, baselineY: number, amplitude: number = 1) => {
    const points: WaveformPoint[] = [];
    const time = Date.now();
    
    // Apply severity variations to amplitude and timing
    let ampVariation = 1;
    let timingVariation = 0;
    
    if (severity === 'mild') {
      ampVariation = 0.9 + Math.random() * 0.2; // ±10% amplitude variation
      timingVariation = (Math.random() - 0.5) * 0.1; // ±5% timing variation
    } else if (severity === 'moderate') {
      ampVariation = 0.8 + Math.random() * 0.4; // ±20% amplitude variation
      timingVariation = (Math.random() - 0.5) * 0.2; // ±10% timing variation
    } else if (severity === 'severe') {
      ampVariation = 0.6 + Math.random() * 0.8; // ±40% amplitude variation
      timingVariation = (Math.random() - 0.5) * 0.3; // ±15% timing variation
    }
    
    const finalAmplitude = amplitude * ampVariation;
    const beatWidth = 50 + (timingVariation * 20);
    
    // P wave (small upward deflection)
    points.push({ x: centerX - beatWidth * 0.8, y: baselineY, time });
    points.push({ x: centerX - beatWidth * 0.6, y: baselineY - finalAmplitude * 8, time });
    points.push({ x: centerX - beatWidth * 0.4, y: baselineY, time });
    
    // QRS complex (sharp spike)
    points.push({ x: centerX - beatWidth * 0.2, y: baselineY, time });
    points.push({ x: centerX - beatWidth * 0.1, y: baselineY + finalAmplitude * 5, time }); // Q wave (small downward)
    points.push({ x: centerX, y: baselineY - finalAmplitude * 40, time }); // R wave (large upward spike)
    points.push({ x: centerX + beatWidth * 0.1, y: baselineY + finalAmplitude * 8, time }); // S wave (downward)
    points.push({ x: centerX + beatWidth * 0.2, y: baselineY, time });
    
    // T wave (smaller upward deflection)
    points.push({ x: centerX + beatWidth * 0.4, y: baselineY, time });
    points.push({ x: centerX + beatWidth * 0.6, y: baselineY - finalAmplitude * 12, time });
    points.push({ x: centerX + beatWidth * 0.8, y: baselineY, time });
    
    return points;
  }, [severity]);

  // Check if it's time for a beat based on severity and frequency
  const shouldGenerateBeat = useCallback((currentTime: number) => {
    const timeSinceLastBeat = currentTime - lastBeatTimeRef.current;
    let effectiveBeatInterval = beatInterval;
    
    // Apply severity-based timing variations
    if (severity === 'mild' && frequency === 'occasional') {
      // 5% chance of premature beat (20% earlier)
      if (Math.random() < 0.05 && timeSinceLastBeat > beatInterval * 0.8) {
        return true;
      }
    } else if (severity === 'moderate') {
      // Irregular spacing, occasional double beats
      if (frequency === 'frequent') {
        // 10% chance of double beat
        if (Math.random() < 0.1 && timeSinceLastBeat > beatInterval * 0.6) {
          return true;
        }
      }
      // Variable interval ±25%
      effectiveBeatInterval = beatInterval * (0.75 + Math.random() * 0.5);
    } else if (severity === 'severe') {
      // Frequent irregularities
      if (frequency === 'frequent') {
        // 15% chance of dropped beat (longer interval)
        if (Math.random() < 0.15) {
          effectiveBeatInterval = beatInterval * (1.5 + Math.random());
        }
        // 20% chance of premature beat
        else if (Math.random() < 0.2 && timeSinceLastBeat > beatInterval * 0.5) {
          return true;
        }
      }
      // Highly variable interval ±50%
      effectiveBeatInterval = beatInterval * (0.5 + Math.random());
    }
    
    return timeSinceLastBeat >= effectiveBeatInterval;
  }, [beatInterval, severity, frequency]);

  // Drawing function
  const draw = useCallback((ctx: CanvasRenderingContext2D, time: number) => {
    // Clear canvas with clean background
    ctx.fillStyle = '#0F172A'; // Clean dark background
    ctx.fillRect(0, 0, width, height);
    
    // Draw minimal grid lines (less prominent)
    ctx.strokeStyle = '#1E293B40'; // Very subtle grid
    ctx.lineWidth = 0.3;
    
    // Fewer horizontal grid lines
    for (let y = height/4; y <= height; y += height/4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Fewer vertical grid lines  
    for (let x = width/8; x <= width; x += width/8) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    const baselineY = height / 2;
    const scrollSpeed = 2; // pixels per frame
    
    // Update waveform data positions (scroll left)
    waveformDataRef.current = waveformDataRef.current
      .map(point => ({ ...point, x: point.x - scrollSpeed }))
      .filter(point => point.x > -100); // Remove points that have scrolled off screen
    
    // Check if we need to generate a new beat
    if (shouldGenerateBeat(time)) {
      const newBeatPoints = generateBeatPattern(width + 50, baselineY);
      waveformDataRef.current.push(...newBeatPoints);
      lastBeatTimeRef.current = time;
    }
    
    // Draw baseline (flatline when no beats) with enhanced styling
    ctx.strokeStyle = getWaveformColor();
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Add subtle glow effect for better visibility
    ctx.shadowColor = getWaveformColor();
    ctx.shadowBlur = 3;
    
    if (waveformDataRef.current.length === 0) {
      // Draw baseline
      ctx.beginPath();
      ctx.moveTo(0, baselineY);
      ctx.lineTo(width, baselineY);
      ctx.stroke();
    } else {
      // Draw waveform
      ctx.beginPath();
      
      // Start with baseline from left edge to first point
      if (waveformDataRef.current.length > 0) {
        const firstPoint = waveformDataRef.current[0];
        if (firstPoint.x > 0) {
          ctx.moveTo(0, baselineY);
          ctx.lineTo(firstPoint.x, baselineY);
        }
      }
      
      // Draw the waveform points with smooth curves
      waveformDataRef.current.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          const prevPoint = waveformDataRef.current[index - 1];
          const controlX = (prevPoint.x + point.x) / 2;
          const controlY = (prevPoint.y + point.y) / 2;
          
          // Use quadratic curves for smoother transitions
          if (Math.abs(point.y - prevPoint.y) < 5) {
            ctx.lineTo(point.x, point.y);
          } else {
            ctx.quadraticCurveTo(controlX, prevPoint.y, point.x, point.y);
          }
        }
      });
      
      // Continue baseline to right edge
      const lastPoint = waveformDataRef.current[waveformDataRef.current.length - 1];
      if (lastPoint && lastPoint.x < width) {
        ctx.lineTo(width, baselineY);
      }
      
      ctx.stroke();
    }
    
    // Enhanced glow effect for critical status
    if (status === 'critical') {
      ctx.shadowBlur = 8;
      ctx.stroke();
    }
    
    // Reset shadow
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
  }, [width, height, getWaveformColor, generateBeatPattern, shouldGenerateBeat, status]);

  // Optimized animation loop with throttling
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isVisible) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const time = Date.now();
    
    // Throttle rendering to ~30fps for better performance
    if (time - lastRenderTimeRef.current < 33) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }
    
    lastRenderTimeRef.current = time;
    setCurrentTime(time);
    
    draw(ctx, time);
    
    animationRef.current = requestAnimationFrame(animate);
  }, [draw, isVisible]);

  // Intersection Observer for visibility optimization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(canvas);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Initialize and start animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set canvas resolution for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
    
    // Start animation
    lastBeatTimeRef.current = Date.now();
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [width, height, animate]);

  // Reset animation when BPM or severity changes
  useEffect(() => {
    waveformDataRef.current = [];
    lastBeatTimeRef.current = Date.now();
  }, [bpm, severity, frequency]);

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className="block rounded-md"
        style={{ 
          width: `${width}px`, 
          height: `${height}px`,
          backgroundColor: '#0F172A'
        }}
      />
      {/* Subtle BPM indicator - smaller and less prominent */}
      <div className="absolute top-2 right-2 text-xs text-gray-400 bg-gray-900/70 px-2 py-1 rounded" style={{ fontFamily: 'Poppins, sans-serif' }}>
        {bpm}
      </div>
    </div>
  );
}