"use client";

import {
  Component,
  memo,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

const LAPTOP_MODEL_URL = "/laptop.draco.glb";
const DRACO_DECODER_PATH = "/draco/";

const VARIANTS = [
  { id: "linkedin", label: "LinkedIn", bodyColor: "#2d2d32", accent: "#0a66c2", screenBg: "#f3f2ef", navColor: "#ffffff", navBorder: true },
  { id: "indeed", label: "Indeed", bodyColor: "#332e28", accent: "#2557a7", screenBg: "#ffffff", navColor: "#2557a7", navBorder: false },
  { id: "glassdoor", label: "Glassdoor", bodyColor: "#242832", accent: "#0caa41", screenBg: "#ffffff", navColor: "#ffffff", navBorder: true },
  { id: "reed", label: "Reed", bodyColor: "#322028", accent: "#e01931", screenBg: "#ffffff", navColor: "#131b26", navBorder: false },
] as const;

type Variant = (typeof VARIANTS)[number];

const SCREEN_IMAGES: string[] = [
  "/screens/linkedin.png",
  "/screens/indeed.png",
  "/screens/glassdoor.png",
  "/screens/reed-new-logo.png",
];
const MOBILE_CANVAS_DPR: [number, number] = [1.5, 2];
const DESKTOP_CANVAS_DPR: [number, number] = [1, 2];

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

function canCreateWebGLContext() {
  if (typeof document === "undefined") return false;

  const canvas = document.createElement("canvas");
  const contextOptions: WebGLContextAttributes = {
    failIfMajorPerformanceCaveat: true,
  };
  const context: WebGLRenderingContext | WebGL2RenderingContext | null =
    canvas.getContext("webgl2", contextOptions) ??
    canvas.getContext("webgl", contextOptions);

  if (!context) {
    return false;
  }

  context.getExtension("WEBGL_lose_context")?.loseContext();

  return true;
}

type LaptopCanvasErrorBoundaryProps = {
  children: ReactNode;
  onError: () => void;
};

type LaptopCanvasErrorBoundaryState = {
  hasError: boolean;
};

class LaptopCanvasErrorBoundary extends Component<
  LaptopCanvasErrorBoundaryProps,
  LaptopCanvasErrorBoundaryState
> {
  state: LaptopCanvasErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}

function getLaptopProgress(scrollProgress: number, index: number, isMobile: boolean) {
  const segmentSize = isMobile ? 0.23 : 0.2;
  const start = isMobile ? 0.08 + index * 0.18 : 0.05 + index * segmentSize;
  const end = start + segmentSize;

  return clamp01((scrollProgress - start) / (end - start));
}

function configureScreenTexture(texture: THREE.Texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
}

function applyScreenMaterial(
  targetMaterial: THREE.MeshStandardMaterial,
  texture: THREE.Texture,
) {
  targetMaterial.map = texture;
  targetMaterial.emissiveMap = texture;
  targetMaterial.emissive = new THREE.Color(0xffffff);
  targetMaterial.emissiveIntensity = 1.0;
  targetMaterial.color = new THREE.Color(0xffffff);
  targetMaterial.needsUpdate = true;
}

function createScreenTexture(variant: Variant): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = variant.screenBg;
  ctx.fillRect(0, 0, 512, 320);
  ctx.fillStyle = variant.navColor;
  ctx.fillRect(0, 0, 512, 28);
  if (variant.navBorder) {
    ctx.fillStyle = "#e0e0e0";
    ctx.fillRect(0, 27, 512, 1);
  }
  ctx.fillStyle = variant.accent;
  ctx.fillRect(12, 7, 24, 14);
  ctx.fillStyle = variant.navBorder ? "#999" : "rgba(255,255,255,0.5)";
  for (let i = 0; i < 4; i += 1) {
    ctx.fillRect(100 + i * 60, 10, 35, 8);
  }
  ctx.fillStyle = variant.id === "glassdoor" ? variant.accent : variant.id === "reed" ? "#131b26" : "#f5f5f5";
  ctx.fillRect(0, 28, 512, 55);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(40, 40, 200, 20);
  ctx.fillRect(250, 40, 120, 20);
  ctx.fillStyle = variant.accent;
  ctx.fillRect(380, 40, 80, 20);
  for (let i = 0; i < 4; i += 1) {
    const y = 100 + i * 48;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(20, y, 280, 40);
    ctx.fillStyle = "#eee";
    ctx.fillRect(20, y, 280, 1);
    ctx.fillStyle = variant.accent;
    ctx.fillRect(30, y + 8, 120, 6);
    ctx.fillStyle = "#888";
    ctx.fillRect(30, y + 20, 80, 5);
    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(30, y + 30, 40, 6);
    ctx.fillRect(75, y + 30, 40, 6);
  }
  ctx.fillStyle = "#fafafa";
  ctx.fillRect(320, 100, 180, 200);
  ctx.fillStyle = "#ddd";
  ctx.fillRect(335, 115, 150, 8);
  ctx.fillRect(335, 135, 120, 6);
  const texture = new THREE.CanvasTexture(canvas);
  texture.flipY = false;
  return texture;
}

function ApplyScreenTexture({
  url,
  material,
}: {
  url: string;
  material: THREE.MeshStandardMaterial;
}) {
  const texture = useLoader(THREE.TextureLoader, url);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    configureScreenTexture(texture);

    const uvMinX = 0.125;
    const uvMaxX = 0.375;
    const uvMinY = 0.25;
    const uvMaxY = 0.5;

    const baseRepeatX = 1 / (uvMaxX - uvMinX);
    const baseRepeatY = 1 / (uvMaxY - uvMinY);
    const baseOffsetX = -uvMinX * baseRepeatX;
    const baseOffsetY = -uvMinY * baseRepeatY;

    const screenAspect = 1.432;
    const image = texture.image as { width: number; height: number };
    const ratio = image.width / image.height / screenAspect;

    let repeatX = baseRepeatX;
    let repeatY = baseRepeatY;
    let offsetX = baseOffsetX;
    let offsetY = baseOffsetY;

    if (ratio > 1) {
      repeatY = baseRepeatY * ratio;
      offsetY = baseOffsetY + (baseRepeatY - repeatY) / 2;
    } else if (ratio < 1) {
      repeatX = baseRepeatX / ratio;
      offsetX = baseOffsetX + (baseRepeatX - repeatX) / 2;
    }

    texture.repeat.set(repeatX, repeatY);
    texture.offset.set(offsetX, offsetY);
    applyScreenMaterial(material, texture);
    invalidate();
  }, [texture, material, invalidate]);

  return null;
}

function LaptopInstance({
  variant,
  position,
  progressRef,
  index,
  laptopScale,
  screenImageUrl,
  isMobile,
}: {
  variant: Variant;
  position: [number, number, number];
  progressRef: RefObject<number>;
  index: number;
  laptopScale: number;
  screenImageUrl: string;
  isMobile: boolean;
}) {
  const { scene } = useGLTF(LAPTOP_MODEL_URL, DRACO_DECODER_PATH);
  const hingeRef = useRef<THREE.Object3D | null>(null);
  const screenDisplayRef = useRef<THREE.Mesh | null>(null);
  const [myScene, setMyScene] = useState<THREE.Group | null>(null);
  const [screenMat, setScreenMat] = useState<THREE.MeshStandardMaterial | null>(null);
  const builtRef = useRef(false);

  useEffect(() => {
    if (builtRef.current) return;
    builtRef.current = true;

    const clone = scene.clone(true);
    const defaultTexture = createScreenTexture(variant);
    let foundScreenMaterial: THREE.MeshStandardMaterial | null = null;

    clone.traverse((child) => {
      if (child.name === "Hinge_Pivot") {
        hingeRef.current = child;
      }

      if (!(child instanceof THREE.Mesh)) {
        return;
      }

      child.material = (child.material as THREE.Material).clone();

      if (child.name === "Laptop_Base" || child.name === "Lid_Shell") {
        const mat = child.material as THREE.MeshStandardMaterial;
        mat.color = new THREE.Color(variant.bodyColor);
        mat.metalness = 0.9;
        mat.roughness = 0.25;
      }

      if (child.name === "Screen_Display") {
        screenDisplayRef.current = child;
        const mat = child.material as THREE.MeshStandardMaterial;
        mat.map = defaultTexture;
        mat.emissiveMap = defaultTexture;
        mat.emissive = new THREE.Color(0xffffff);
        mat.emissiveIntensity = 1.5;
        mat.roughness = 0.05;
        mat.metalness = 0;
        mat.side = THREE.DoubleSide;
        mat.polygonOffset = true;
        mat.polygonOffsetFactor = -1;
        mat.polygonOffsetUnits = -1;
        mat.needsUpdate = true;
        foundScreenMaterial = mat;
      }
    });

    setMyScene(clone);
    setScreenMat(foundScreenMaterial);
  }, [isMobile, scene, variant]);

  useFrame((_, delta) => {
    if (!hingeRef.current) return;
    const scrollProgress = progressRef.current ?? 0;
    const laptopProgress = getLaptopProgress(scrollProgress, index, isMobile);
    const targetAngle = -2.094 + laptopProgress * 2.094;

    if (isMobile) {
      hingeRef.current.rotation.x = targetAngle;

      if (screenDisplayRef.current) {
        screenDisplayRef.current.visible = laptopProgress < 0.955;
      }

      return;
    }

    if (screenDisplayRef.current) {
      screenDisplayRef.current.visible = true;
    }

    hingeRef.current.rotation.x = THREE.MathUtils.damp(
      hingeRef.current.rotation.x,
      targetAngle,
      11,
      delta,
    );
  });

  if (!myScene) return null;

  return (
    <group position={position} scale={[laptopScale, laptopScale, laptopScale]}>
      <primitive object={myScene} />
      {screenMat && (
        <Suspense fallback={null}>
          <ApplyScreenTexture url={screenImageUrl} material={screenMat} />
        </Suspense>
      )}
    </group>
  );
}

function Scene({ progressRef, isMobile }: { progressRef: RefObject<number>; isMobile: boolean }) {
  const visibleVariants = VARIANTS;

  const positions: [number, number, number][] = isMobile
    ? [
      [-1.05, -0.9, 0],
      [-0.35, -0.9, 0],
      [0.35, -0.9, 0],
      [1.05, -0.9, 0],
    ]
    : [
      [-2.55, -1.2, 0],
      [-0.85, -1.2, 0],
      [0.85, -1.2, 0],
      [2.55, -1.2, 0],
    ];

  const laptopScale = isMobile ? 1.45 : 2.4;

  return (
    <>
      <ambientLight intensity={0.15} />
      <directionalLight position={[4, 5, 3]} intensity={1.8} color="#f5f0e8" />
      <directionalLight position={[-3, 3, 2]} intensity={0.6} color="#c0d0ff" />
      <directionalLight position={[0, 2, -4]} intensity={1.2} color="#dde0ff" />
      {visibleVariants.map((variant, index) => (
        <LaptopInstance
          key={variant.id}
          variant={variant}
          position={positions[index]}
          progressRef={progressRef}
          index={index}
          laptopScale={laptopScale}
          screenImageUrl={SCREEN_IMAGES[index]}
          isMobile={isMobile}
        />
      ))}
    </>
  );
}

type HeroLaptopCanvasProps = {
  progressRef: RefObject<number>;
  isMobile: boolean;
  onInvalidateReady: (invalidate: () => void) => void;
};

const HeroLaptopCanvas = memo(function HeroLaptopCanvas({
  progressRef,
  isMobile,
  onInvalidateReady,
}: HeroLaptopCanvasProps) {
  const [isWebGLAvailable, setIsWebGLAvailable] = useState(
    canCreateWebGLContext,
  );
  const contextLossCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      contextLossCleanupRef.current?.();
    };
  }, []);

  if (!isWebGLAvailable) {
    return null;
  }

  return (
    <LaptopCanvasErrorBoundary onError={() => setIsWebGLAvailable(false)}>
      <Canvas
        key={isMobile ? "test-mobile-laptops" : "test-desktop-laptops"}
        frameloop="demand"
        style={{ pointerEvents: "none" }}
        dpr={isMobile ? MOBILE_CANVAS_DPR : DESKTOP_CANVAS_DPR}
        onCreated={(state) => {
          contextLossCleanupRef.current?.();

          const canvas = state.gl.domElement;
          const handleContextLost = (event: Event) => {
            event.preventDefault();
            contextLossCleanupRef.current?.();
            contextLossCleanupRef.current = null;
            setIsWebGLAvailable(false);
          };

          canvas.addEventListener("webglcontextlost", handleContextLost, false);
          contextLossCleanupRef.current = () => {
            canvas.removeEventListener(
              "webglcontextlost",
              handleContextLost,
              false,
            );
          };

          onInvalidateReady(state.invalidate);
          state.invalidate();
        }}
        camera={{
          position: isMobile ? [0, 1.6, 6.5] : [0, 1.5, 7.5],
          fov: isMobile ? 55 : 45,
          near: 0.1,
          far: 100,
        }}
        gl={{
          antialias: true,
          stencil: false,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
    >
        <Scene progressRef={progressRef} isMobile={isMobile} />
      </Canvas>
    </LaptopCanvasErrorBoundary>
  );
});

export default HeroLaptopCanvas;

useGLTF.preload(LAPTOP_MODEL_URL, DRACO_DECODER_PATH);
