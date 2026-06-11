'use client';

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';

// Fallback procedural textured map in case satellite textures fail to load
function createEarthCanvasTexture(theme: 'light' | 'dark') {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();

  const isLight = theme === 'light';

  ctx.fillStyle = isLight ? '#c3d7f7' : '#0a1424';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = isLight ? '#a8e6cf' : '#1b3a24';

  // Draw North America
  ctx.beginPath();
  ctx.moveTo(150, 100);
  ctx.bezierCurveTo(230, 80, 280, 130, 300, 200);
  ctx.bezierCurveTo(260, 250, 210, 230, 170, 240);
  ctx.bezierCurveTo(140, 250, 90, 180, 150, 100);
  ctx.closePath();
  ctx.fill();

  // Draw South America
  ctx.beginPath();
  ctx.moveTo(270, 250);
  ctx.bezierCurveTo(330, 300, 310, 400, 280, 450);
  ctx.bezierCurveTo(250, 430, 240, 320, 270, 250);
  ctx.closePath();
  ctx.fill();

  // Draw Africa
  ctx.beginPath();
  ctx.moveTo(460, 180);
  ctx.bezierCurveTo(530, 180, 560, 240, 520, 320);
  ctx.bezierCurveTo(490, 360, 460, 330, 440, 260);
  ctx.bezierCurveTo(430, 220, 440, 200, 460, 180);
  ctx.closePath();
  ctx.fill();

  // Draw Europe & Asia (Eurasia)
  ctx.beginPath();
  ctx.moveTo(400, 70);
  ctx.bezierCurveTo(550, 40, 770, 60, 820, 130);
  ctx.bezierCurveTo(770, 220, 670, 200, 580, 180);
  ctx.bezierCurveTo(480, 160, 430, 110, 400, 70);
  ctx.closePath();
  ctx.fill();

  // Draw Australia
  ctx.beginPath();
  ctx.ellipse(800, 340, 55, 35, Math.PI / 12, 0, Math.PI * 2);
  ctx.fill();

  // Draw Antarctica (Ice Cap)
  ctx.fillStyle = isLight ? '#f1f3f4' : '#ffffff';
  ctx.fillRect(0, 475, canvas.width, 37);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// Active satellite orbit lines with small moving dot indicators
function OrbitRing({ radius, speed, angleX, angleZ, color, isLightTheme }: {
  radius: number;
  speed: number;
  angleX: number;
  angleZ: number;
  color: string;
  isLightTheme?: boolean;
}) {
  const ringRef = useRef<THREE.Group>(null);
  const satRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (ringRef.current) {
      ringRef.current.rotation.y = time * speed * 0.15;
    }
    if (satRef.current) {
      const theta = time * speed * 1.5;
      satRef.current.position.set(
        Math.cos(theta) * radius,
        0,
        Math.sin(theta) * radius
      );
    }
  });

  const tubeRadius = isLightTheme ? 0.005 : 0.003;
  const ringOpacity = isLightTheme ? 0.45 : 0.18;
  const satSize = isLightTheme ? 0.038 : 0.026;

  return (
    <group rotation={[angleX, 0, angleZ]} ref={ringRef}>
      {/* Torus ring path line */}
      <mesh>
        <torusGeometry args={[radius, tubeRadius, 4, 64]} />
        <meshBasicMaterial color={color} transparent opacity={ringOpacity} />
      </mesh>
      {/* Moving satellite node */}
      <mesh ref={satRef}>
        <sphereGeometry args={[satSize, 8, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

// Floating dust particles that create ambient movement in the empty space
function FloatingDust({ count = 80, isLightTheme }: { count?: number; isLightTheme: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);

  // Generate random positions
  const particles = useMemo(() => {
    const temp = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Position particles in a sphere shell/field around the globe (radii 2.4 to 6.0)
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 2.4 + Math.random() * 3.6; // from 2.4 to 6.0

      temp[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      temp[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      temp[i * 3 + 2] = r * Math.cos(phi);
    }
    return temp;
  }, [count]);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.getElapsedTime() * 0.012;
      pointsRef.current.rotation.x = state.clock.getElapsedTime() * 0.006;
    }
  });

  const color = isLightTheme ? '#1a73e8' : '#00ffff';
  const size = isLightTheme ? 0.07 : 0.04;
  const opacity = isLightTheme ? 0.35 : 0.15;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[particles, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
      />
    </points>
  );
}

interface SmokeParticleProps {
  normal: THREE.Vector3;
  initialAge: number;
  randomOffset: THREE.Vector3;
  score: number;
  isLightTheme: boolean;
  smokeTexture: THREE.Texture;
}

function SmokeParticle({ normal, initialAge, randomOffset, score, isLightTheme, smokeTexture }: SmokeParticleProps) {
  const spriteRef = useRef<THREE.Sprite>(null);

  // Height of smoke rise scales with score (from 0.1 to 1.5 max)
  const maxRise = useMemo(() => {
    return 0.1 + Math.min(1.5, (score / 400) * 0.85);
  }, [score]);

  // Particle size scales with score (from 0.01 to 0.35 max)
  const maxScale = useMemo(() => {
    return 0.01 + Math.min(0.32, (score / 400) * 0.14);
  }, [score]);

  useFrame((state) => {
    if (spriteRef.current) {
      const time = state.clock.getElapsedTime();
      const age = (time * 0.45 + initialAge) % 1.0;

      // Add a natural horizontal wind-drift
      const windDriftX = Math.sin(time * 1.4 + initialAge * 10) * 0.08 * age;
      const windDriftZ = Math.cos(time * 1.1 + initialAge * 10) * 0.08 * age;

      // Position: rises along the normal vector outwards + drift
      const dist = age * maxRise;
      spriteRef.current.position.set(
        normal.x * dist + randomOffset.x * age + windDriftX,
        normal.y * dist + randomOffset.y * age,
        normal.z * dist + randomOffset.z * age + windDriftZ
      );

      // Scale: billowy cloud puff expansion
      const currentScale = maxScale * (1.0 + age * 2.5);
      spriteRef.current.scale.set(currentScale, currentScale, 1.0);

      // Opacity: fades out near the end of life
      if (spriteRef.current.material) {
        const mat = spriteRef.current.material as THREE.SpriteMaterial;
        mat.opacity = (1.0 - age) * 0.8 * Math.min(1.0, score / 80);
      }
    }
  });

  // If score is close to 0, smoke is completely invisible
  if (score < 5) return null;

  // Determine smoke color: white-grey for steam, dark grey for smog, orange-grey for hot fires
  let smokeColor = "#ffffff"; 
  if (score > 400) {
    smokeColor = Math.random() > 0.45 ? "#242424" : "#ff5500";
  } else if (score > 200) {
    smokeColor = "#778899";
  } else if (score > 100) {
    smokeColor = "#a0b0b9";
  }

  return (
    <sprite ref={spriteRef}>
      <spriteMaterial
        map={smokeTexture}
        color={smokeColor}
        transparent
        depthWrite={false}
        blending={isLightTheme ? THREE.NormalBlending : THREE.AdditiveBlending}
      />
    </sprite>
  );
}

interface SmokeEmitterProps {
  position: [number, number, number];
  normal: THREE.Vector3;
  score: number;
  isLightTheme: boolean;
  smokeTexture: THREE.Texture;
}

function SmokeEmitter({ position, normal, score, isLightTheme, smokeTexture }: SmokeEmitterProps) {
  const numParticles = 6;
  const particles = useMemo(() => {
    return Array.from({ length: numParticles }).map((_, i) => ({
      id: i,
      initialAge: i / numParticles,
      randomOffset: new THREE.Vector3(
        (Math.random() - 0.5) * 0.12,
        (Math.random() - 0.5) * 0.12,
        (Math.random() - 0.5) * 0.12
      )
    }));
  }, []);

  return (
    <group position={position}>
      {particles.map(p => (
        <SmokeParticle
          key={p.id}
          normal={normal}
          initialAge={p.initialAge}
          randomOffset={p.randomOffset}
          score={score}
          isLightTheme={isLightTheme}
          smokeTexture={smokeTexture}
        />
      ))}
    </group>
  );
}

// Moon Globe that orbits around the Earth
function MoonGlobe({ isLightTheme }: { isLightTheme: boolean }) {
  const moonRef = useRef<THREE.Mesh>(null);
  const orbitRadius = 3.8;
  const speed = 0.12; // slow elegant orbit speed

  // Load realistic Moon texture from Three.js assets
  const moonTexture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    try {
      const tex = loader.load(
        'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/moon_1024.jpg',
        () => console.log('Moon texture loaded successfully.'),
        undefined,
        (err) => console.warn('Failed loading Moon texture. Falling back to default styling.', err)
      );
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    } catch (e) {
      return null;
    }
  }, []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (moonRef.current) {
      // Slow rotation path around the Earth
      const theta = time * speed;
      moonRef.current.position.set(
        Math.cos(theta) * orbitRadius,
        Math.sin(theta) * 0.12 * orbitRadius, // orbit tilt/inclination
        Math.sin(theta) * orbitRadius
      );
      // Slow rotation on its own axis (tidally locked rotation speed)
      moonRef.current.rotation.y = time * 0.04;
    }
  });

  return (
    <group>
      {/* Soft orbit path loop indicator */}
      <mesh rotation={[Math.PI / 16, 0, 0]}>
        <torusGeometry args={[orbitRadius, 0.002, 4, 64]} />
        <meshBasicMaterial color={isLightTheme ? "#4285f4" : "#00f0ff"} transparent opacity={0.06} />
      </mesh>
      
      {/* Moon Globe Mesh */}
      <mesh ref={moonRef}>
        <sphereGeometry args={[0.32, 20, 20]} /> {/* Proportional sizing */}
        {moonTexture ? (
          <meshStandardMaterial 
            map={moonTexture} 
            roughness={0.9} 
            metalness={0.05} 
          />
        ) : (
          <meshStandardMaterial 
            color={isLightTheme ? "#d0d4dc" : "#6b7280"} 
            roughness={0.9} 
            metalness={0.05} 
          />
        )}
      </mesh>
    </group>
  );
}

function EarthGlobe({ isNormal, score, isLightTheme, theme }: { 
  isNormal: boolean; 
  score: number; 
  isLightTheme: boolean;
  theme: 'light' | 'dark';
}) {
  const globeRef = useRef<THREE.Mesh>(null);
  const cloudRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Sprite>(null);
  
  const speedMultiplier = isNormal ? 0.2 : 0.8 + (score - 400) / 400;

  // Load realistic satellite Earth texture
  const earthTexture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    try {
      const tex = loader.load(
        'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg',
        () => console.log('Satellite Earth map loaded successfully.'),
        undefined,
        (err) => console.warn('Failed loading satellite texture. Falling back to canvas.', err)
      );
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    } catch (e) {
      return createEarthCanvasTexture(theme);
    }
  }, [theme]);

  // Load clouds texture
  const cloudTexture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    try {
      return loader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_clouds_1024.png');
    } catch (e) {
      return null;
    }
  }, []);

  // Soft glowing atmospheric aura behind the Earth globe
  const haloTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(64, 64, 25, 64, 64, 64);
    if (isLightTheme) {
      grad.addColorStop(0, 'rgba(26, 115, 232, 0.38)'); // soft google blue
      grad.addColorStop(0.4, 'rgba(102, 178, 255, 0.18)');
      grad.addColorStop(0.8, 'rgba(232, 240, 254, 0.05)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    } else {
      grad.addColorStop(0, 'rgba(0, 255, 102, 0.32)'); // neon green
      grad.addColorStop(0.4, 'rgba(0, 240, 255, 0.14)'); // cyan
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
  }, [isLightTheme]);

  // Soft billowy radial gradient texture canvas for natural smoke sprites
  const smokeTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.25, 'rgba(235, 235, 235, 0.7)');
    grad.addColorStop(0.5, 'rgba(180, 180, 180, 0.25)');
    grad.addColorStop(1, 'rgba(180, 180, 180, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
  }, []);

  // Distribute 20 smoke emitters on coordinates across the globe
  const numEmitters = 20;
  const emitters = useMemo(() => {
    const list = [];
    const tempPos = new THREE.Vector3();
    const tempNormal = new THREE.Vector3();
    const radius = 2.0;

    for (let i = 0; i < numEmitters; i++) {
      const offset = 2 / numEmitters;
      const increment = Math.PI * (3 - Math.sqrt(5));
      const y = ((i * offset) - 1) + (offset / 2);
      const r = Math.sqrt(1 - y * y);
      const phi = i * increment;
      const x = Math.cos(phi) * r;
      const z = Math.sin(phi) * r;
      
      const px = x * radius;
      const py = y * radius;
      const pz = z * radius;
      
      tempPos.set(px, py, pz);
      tempNormal.copy(tempPos).normalize();
      
      list.push({
        id: i,
        position: [px, py, pz] as [number, number, number],
        normal: tempNormal.clone()
      });
    }
    return list;
  }, []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const rot = time * 0.03 * speedMultiplier;
    
    if (globeRef.current) {
      globeRef.current.rotation.y = rot;
    }
    if (cloudRef.current) {
      cloudRef.current.rotation.y = rot * 1.25;
      cloudRef.current.rotation.x = rot * 0.1;
    }
    if (haloRef.current) {
      // Keep the halo positioned slightly behind the Earth relative to the camera
      const dir = state.camera.position.clone().normalize();
      // Move slightly backwards along the camera direction to avoid clipping
      haloRef.current.position.copy(dir).multiplyScalar(-0.15);
    }
  });

  // Orbital lines configurations
  const orbitColor1 = isLightTheme ? "#4285f4" : "#00f0ff";
  const orbitColor2 = isLightTheme ? "#34a853" : "#00ff66";

  return (
    <group>
      {/* 0. Soft Atmospheric Glow (Halo) behind the Earth */}
      <sprite ref={haloRef} scale={[5.0, 5.0, 1.0]}>
        <spriteMaterial
          map={haloTexture}
          transparent
          depthWrite={false}
          blending={isLightTheme ? THREE.NormalBlending : THREE.AdditiveBlending}
        />
      </sprite>

      {/* 1. Realistic Satellite Earth Globe */}
      <mesh ref={globeRef}>
        <sphereGeometry args={[2.0, 48, 48]} />
        <meshStandardMaterial 
          map={earthTexture}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* 2. Realistic Floating Clouds Layer */}
      {cloudTexture && (
        <mesh ref={cloudRef}>
          <sphereGeometry args={[2.03, 36, 36]} />
          <meshStandardMaterial 
            alphaMap={cloudTexture}
            transparent
            opacity={0.4}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* 3. Orbit Loops and Moving Satellites */}
      <OrbitRing radius={2.5} speed={0.4} angleX={Math.PI / 6} angleZ={Math.PI / 12} color={orbitColor1} isLightTheme={isLightTheme} />
      <OrbitRing radius={3.1} speed={-0.3} angleX={-Math.PI / 4} angleZ={-Math.PI / 6} color={orbitColor2} isLightTheme={isLightTheme} />

      {/* 4. Scanning Grid Deck (Grounding deck underneath the Earth) */}
      <gridHelper 
        args={[
          14, 
          14, 
          isLightTheme ? "#1a73e8" : "#555555", 
          isLightTheme ? "#dae0e8" : "#222222"
        ]} 
        position={[0, -2.45, 0]} 
      />

      {/* 5. Emitters sending rising billowy smoke particles */}
      {emitters.map(emitter => (
        <SmokeEmitter 
          key={emitter.id}
          position={emitter.position}
          normal={emitter.normal}
          score={score}
          isLightTheme={isLightTheme}
          smokeTexture={smokeTexture}
        />
      ))}

      {/* 6. Moon Globe orbiting Earth */}
      <MoonGlobe isLightTheme={isLightTheme} />
    </group>
  );
}

interface SphereParticlesProps {
  isNormal: boolean;
  score: number;
  theme?: 'light' | 'dark';
}

export default function CarbonTwin3D({ isNormal, score, theme = 'dark' }: SphereParticlesProps) {
  const [mounted, setMounted] = useState(false);
  const isLightTheme = theme === 'light';

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black/40 rounded-2xl border border-neutral-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-2 border-neutral-700 border-t-[#00ff66] animate-spin" />
          <span className="text-xs text-neutral-500 font-mono tracking-widest uppercase">Initializing WebGL Context...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full rounded-2xl overflow-hidden border transition-all duration-500 ${
      isLightTheme 
        ? 'bg-[radial-gradient(circle_at_center,_#e8f0fe_0%,_#f8f9fa_80%)] border-[#dadce0]' 
        : 'bg-[radial-gradient(circle_at_center,_rgba(0,255,102,0.04)_0%,_#0a0a0a_80%)] border-neutral-900'
    }`}>
      {/* 3D R3F Canvas */}
      <Canvas
        camera={{ position: [0, 0, 5.2], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
      >
        {isLightTheme ? (
          <>
            <ambientLight intensity={1.6} />
            <directionalLight position={[5, 3, 5]} intensity={1.8} />
            <directionalLight position={[-5, -3, -5]} intensity={0.6} color="#e8f0fe" />
          </>
        ) : (
          <>
            <ambientLight intensity={1.2} />
            <directionalLight position={[5, 3, 5]} intensity={1.5} />
          </>
        )}
        
        <EarthGlobe isNormal={isNormal} score={score} isLightTheme={isLightTheme} theme={theme} />
        
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minDistance={3.5}
          maxDistance={8}
          autoRotate={false}
        />
        
        {/* Ambient background stars / dust depending on the active theme */}
        {!isLightTheme ? (
          <>
            <Stars
              radius={100}
              depth={50}
              count={150}
              factor={3}
              saturation={0}
              fade
              speed={1}
            />
            <FloatingDust isLightTheme={false} count={50} />
          </>
        ) : (
          <FloatingDust isLightTheme={true} count={80} />
        )}
      </Canvas>

      {/* Glassmorphic overlay data card */}
      <div className={`absolute top-4 left-4 p-3.5 rounded-xl border backdrop-blur-md transition-colors duration-500 ${
        isLightTheme ? 'bg-white/80 border-[#dadce0]' : 'bg-black/60 border-neutral-800'
      }`}>
        <span className={`text-[9px] font-mono tracking-widest uppercase block mb-1 ${
          isLightTheme ? 'text-neutral-500' : 'text-neutral-400'
        }`}>
          Satellite Earth replica
        </span>
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${
            isNormal 
              ? (isLightTheme ? 'bg-[#1e8e3e]' : 'bg-[#00ff66] pulse-green') 
              : (isLightTheme ? 'bg-[#d93025]' : 'bg-[#ff5500] pulse-orange')
          }`} />
          <span className={`text-xs font-semibold font-mono tracking-tight ${
            isLightTheme 
              ? (isNormal ? 'text-[#1e8e3e]' : 'text-[#d93025]') 
              : (isNormal ? 'text-[#00ff66]' : 'text-[#ff5500]')
          }`}>
            {isNormal ? 'CLEAN ATMOSPHERE' : 'REACTING CO2 SMOG'}
          </span>
        </div>
      </div>

      <div className={`absolute bottom-4 right-4 p-2.5 rounded-lg border text-[9px] font-mono pointer-events-none ${
        isLightTheme ? 'bg-white/80 border-[#dadce0] text-neutral-500' : 'bg-black/45 border-neutral-900 text-neutral-500'
      }`}>
        Drag to rotate • Scroll to zoom
      </div>
    </div>
  );
}
