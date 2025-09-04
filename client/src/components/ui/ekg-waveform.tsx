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

  // Calculate beat interval from BPM - much longer to show single beat
  const beatInterval = (60000 / bpm) * 6; // 6x longer intervals for single beat display
  
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

  // Generate heartbeat pattern - always show beats for 50 BPM
  const generateBeatPattern = useCallback((centerX: number, baselineY: number, amplitude: number = 1) => {
    const points: WaveformPoint[] = [];
    const time = Date.now();
    
    // For normal status, generate heartbeat matching exact reference shape
    if (status === 'normal' && severity === 'none') {
      // Match exact reference EKG shape with contained peaks and proper valleys
      points.push({ x: centerX - 120, y: baselineY, time });
      points.push({ x: centerX - 80, y: baselineY, time }); // Baseline approach
      points.push({ x: centerX - 30, y: baselineY, time }); // Baseline before valley
      points.push({ x: centerX - 25, y: baselineY + 20, time }); // Sharp valley down
      points.push({ x: centerX - 20, y: baselineY + 25, time }); // Bottom of valley
      points.push({ x: centerX - 15, y: baselineY, time }); // Sharp rise back to baseline
      points.push({ x: centerX - 10, y: baselineY, time }); // Brief baseline
      points.push({ x: centerX - 2, y: baselineY - 30, time }); // Sharp rise to peak (contained)
      points.push({ x: centerX, y: baselineY - 35, time }); // Peak (fits within bounds)
      points.push({ x: centerX + 2, y: baselineY - 30, time }); // Sharp fall from peak
      points.push({ x: centerX + 10, y: baselineY, time }); // Return to baseline
      points.push({ x: centerX + 15, y: baselineY, time }); // Brief baseline
      points.push({ x: centerX + 20, y: baselineY + 15, time }); // Small valley
      points.push({ x: centerX + 25, y: baselineY, time }); // Back to baseline
      points.push({ x: centerX + 80, y: baselineY, time }); // Extended baseline
      points.push({ x: centerX + 120, y: baselineY, time });
      return points;
    }
    
    // For cardiac events, create very dramatic spikes matching reference image
    let spikeHeight = 0;
    if (severity === 'mild') {
      spikeHeight = amplitude * 40;
    } else if (severity === 'moderate') {
      spikeHeight = amplitude * 55;
    } else if (severity === 'severe') {
      spikeHeight = amplitude * 70;
    }
    
    // Simple cardiac event spike
    points.push({ x: centerX - 20, y: baselineY, time });
    points.push({ x: centerX - 10, y: baselineY - spikeHeight * 0.3, time });
    points.push({ x: centerX, y: baselineY - spikeHeight, time }); // Main spike
    points.push({ x: centerX + 10, y: baselineY - spikeHeight * 0.3, time });
    points.push({ x: centerX + 20, y: baselineY, time });
    
    return points;
  }, [severity, status]);

  // Check if it's time for a heartbeat based on BPM and events
  const shouldGenerateBeat = useCallback((currentTime: number) => {
    const timeSinceLastBeat = currentTime - lastBeatTimeRef.current;
    
    // For normal status, always maintain regular heartbeat at specified BPM
    if (status === 'normal' && severity === 'none') {
      return timeSinceLastBeat >= beatInterval;
    }
    
    // For cardiac events, generate based on severity and frequency (additional to normal beats)
    let eventInterval = beatInterval;
    
    if (severity === 'mild') {
      eventInterval = frequency === 'occasional' ? 8000 : 5000; // 8s or 5s intervals
    } else if (severity === 'moderate') {
      eventInterval = frequency === 'occasional' ? 5000 : 3000; // 5s or 3s intervals
    } else if (severity === 'severe') {
      eventInterval = frequency === 'occasional' ? 3000 : 1500; // 3s or 1.5s intervals
    }
    
    return timeSinceLastBeat >= eventInterval;
  }, [beatInterval, severity, frequency, status]);

  // Drawing function
  const draw = useCallback((ctx: CanvasRenderingContext2D, time: number) => {
    // Clear canvas with clean dark background
    ctx.fillStyle = '#000000'; // Pure black background
    ctx.fillRect(0, 0, width, height);
    
    // Draw subtle grid lines (very minimal)
    ctx.strokeStyle = '#1A5A3A30'; // Dark green grid with low opacity
    ctx.lineWidth = 0.5;
    
    // Draw horizontal grid lines
    const gridSpacing = height / 6;
    for (let y = gridSpacing; y < height; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Draw vertical grid lines
    const verticalSpacing = width / 10;
    for (let x = verticalSpacing; x < width; x += verticalSpacing) {
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
    
    // Ensure continuous baseline connection between beats
    // Find the rightmost point in current waveform data
    const rightmostPoint = waveformDataRef.current.reduce((rightmost, point) => 
      point.x > rightmost.x ? point : rightmost, { x: -Infinity, y: baselineY, time: 0 });
    
    // If there's a gap between the rightmost point and the right edge, fill with baseline
    if (rightmostPoint.x < width - scrollSpeed) {
      // Add continuous baseline points from the last waveform point to the right edge
      const gapStart = Math.max(rightmostPoint.x, 0);
      for (let x = gapStart; x <= width + 50; x += scrollSpeed * 2) {
        waveformDataRef.current.push({ x, y: baselineY, time });
      }
    }
    
    // Draw clean waveform line
    ctx.strokeStyle = getWaveformColor();
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Add subtle glow for better visibility
    ctx.shadowColor = getWaveformColor();
    ctx.shadowBlur = 2;
    
    // Draw only the waveform line (no baseline)
    if (waveformDataRef.current.length > 0) {
      // Draw waveform events
      ctx.beginPath();
      
      // Draw the waveform points with clean lines
      waveformDataRef.current.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          // Use straight lines for cleaner, more clinical appearance
          ctx.lineTo(point.x, point.y);
        }
      });
      
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
    <div className={`relative overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        className="block rounded-md max-w-full"
        style={{ 
          width: `${width}px`, 
          height: `${height}px`,
          backgroundColor: '#000000',
          maxWidth: '100%'
        }}
      />
    </div>
  );
}