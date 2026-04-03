"use client";

import { useEffect, useRef, useCallback } from "react";

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [1, 1, 1];
  return [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255,
  ];
};

const vertex = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uTimeSpeed;
uniform float uColorBalance;
uniform float uWarpStrength;
uniform float uWarpFrequency;
uniform float uWarpSpeed;
uniform float uWarpAmplitude;
uniform float uBlendAngle;
uniform float uBlendSoftness;
uniform float uRotationAmount;
uniform float uNoiseScale;
uniform float uGrainAmount;
uniform float uGrainScale;
uniform float uGrainAnimated;
uniform float uContrast;
uniform float uGamma;
uniform float uSaturation;
uniform vec2 uCenterOffset;
uniform float uZoom;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
out vec4 fragColor;
#define S(a,b,t) smoothstep(a,b,t)
mat2 Rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
vec2 hash(vec2 p){p=vec2(dot(p,vec2(2127.1,81.17)),dot(p,vec2(1269.5,283.37)));return fract(sin(p)*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);float n=mix(mix(dot(-1.0+2.0*hash(i+vec2(0.0,0.0)),f-vec2(0.0,0.0)),dot(-1.0+2.0*hash(i+vec2(1.0,0.0)),f-vec2(1.0,0.0)),u.x),mix(dot(-1.0+2.0*hash(i+vec2(0.0,1.0)),f-vec2(0.0,1.0)),dot(-1.0+2.0*hash(i+vec2(1.0,1.0)),f-vec2(1.0,1.0)),u.x),u.y);return 0.5+0.5*n;}
void mainImage(out vec4 o, vec2 C){
  float t=iTime*uTimeSpeed;
  vec2 uv=C/iResolution.xy;
  float ratio=iResolution.x/iResolution.y;
  vec2 tuv=uv-0.5+uCenterOffset;
  tuv/=max(uZoom,0.001);
  float degree=noise(vec2(t*0.1,tuv.x*tuv.y)*uNoiseScale);
  tuv.y*=1.0/ratio;
  tuv*=Rot(radians((degree-0.5)*uRotationAmount+180.0));
  tuv.y*=ratio;
  float frequency=uWarpFrequency;
  float ws=max(uWarpStrength,0.001);
  float amplitude=uWarpAmplitude/ws;
  float warpTime=t*uWarpSpeed;
  tuv.x+=sin(tuv.y*frequency+warpTime)/amplitude;
  tuv.y+=sin(tuv.x*(frequency*1.5)+warpTime)/(amplitude*0.5);
  vec3 colLav=uColor1;
  vec3 colOrg=uColor2;
  vec3 colDark=uColor3;
  float b=uColorBalance;
  float s=max(uBlendSoftness,0.0);
  mat2 blendRot=Rot(radians(uBlendAngle));
  float blendX=(tuv*blendRot).x;
  float edge0=-0.3-b-s;
  float edge1=0.2-b+s;
  float v0=0.5-b+s;
  float v1=-0.3-b-s;
  vec3 layer1=mix(colDark,colOrg,S(edge0,edge1,blendX));
  vec3 layer2=mix(colOrg,colLav,S(edge0,edge1,blendX));
  vec3 col=mix(layer1,layer2,S(v0,v1,tuv.y));
  vec2 grainUv=uv*max(uGrainScale,0.001);
  if(uGrainAnimated>0.5){grainUv+=vec2(iTime*0.05);}
  float grain=fract(sin(dot(grainUv,vec2(12.9898,78.233)))*43758.5453);
  col+=(grain-0.5)*uGrainAmount;
  col=(col-0.5)*uContrast+0.5;
  float luma=dot(col,vec3(0.2126,0.7152,0.0722));
  col=mix(vec3(luma),col,uSaturation);
  col=pow(max(col,0.0),vec3(1.0/max(uGamma,0.001)));
  col=clamp(col,0.0,1.0);
  o=vec4(col,1.0);
}
void main(){
  vec4 o=vec4(0.0);
  mainImage(o,gl_FragCoord.xy);
  fragColor=o;
}
`;

interface GrainientProps {
  timeSpeed?: number;
  colorBalance?: number;
  warpStrength?: number;
  warpFrequency?: number;
  warpSpeed?: number;
  warpAmplitude?: number;
  blendAngle?: number;
  blendSoftness?: number;
  rotationAmount?: number;
  noiseScale?: number;
  grainAmount?: number;
  grainScale?: number;
  grainAnimated?: boolean;
  contrast?: number;
  gamma?: number;
  saturation?: number;
  centerX?: number;
  centerY?: number;
  zoom?: number;
  color1?: string;
  color2?: string;
  color3?: string;
  className?: string;
}

export default function Grainient({
  timeSpeed = 0.25,
  colorBalance = 0.0,
  warpStrength = 1.0,
  warpFrequency = 5.0,
  warpSpeed = 2.0,
  warpAmplitude = 50.0,
  blendAngle = 0.0,
  blendSoftness = 0.05,
  rotationAmount = 500.0,
  noiseScale = 2.0,
  grainAmount = 0.1,
  grainScale = 2.0,
  grainAnimated = false,
  contrast = 1.5,
  gamma = 1.0,
  saturation = 1.0,
  centerX = 0.0,
  centerY = 0.0,
  zoom = 0.9,
  color1 = "#FF9FFC",
  color2 = "#5227FF",
  color3 = "#B19EEF",
  className = "",
}: GrainientProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const programRef = useRef<any>(null);
  const mountedRef = useRef(false);

  // Store props in a ref so we can read them without re-running the setup effect
  const propsRef = useRef({
    timeSpeed, colorBalance, warpStrength, warpFrequency, warpSpeed,
    warpAmplitude, blendAngle, blendSoftness, rotationAmount, noiseScale,
    grainAmount, grainScale, grainAnimated, contrast, gamma, saturation,
    centerX, centerY, zoom, color1, color2, color3,
  });

  // Update uniforms when props change (without recreating the WebGL context)
  const updateUniforms = useCallback(() => {
    const p = propsRef.current;
    const program = programRef.current;
    if (!program) return;
    program.uniforms.uTimeSpeed.value = p.timeSpeed;
    program.uniforms.uColorBalance.value = p.colorBalance;
    program.uniforms.uWarpStrength.value = p.warpStrength;
    program.uniforms.uWarpFrequency.value = p.warpFrequency;
    program.uniforms.uWarpSpeed.value = p.warpSpeed;
    program.uniforms.uWarpAmplitude.value = p.warpAmplitude;
    program.uniforms.uBlendAngle.value = p.blendAngle;
    program.uniforms.uBlendSoftness.value = p.blendSoftness;
    program.uniforms.uRotationAmount.value = p.rotationAmount;
    program.uniforms.uNoiseScale.value = p.noiseScale;
    program.uniforms.uGrainAmount.value = p.grainAmount;
    program.uniforms.uGrainScale.value = p.grainScale;
    program.uniforms.uGrainAnimated.value = p.grainAnimated ? 1.0 : 0.0;
    program.uniforms.uContrast.value = p.contrast;
    program.uniforms.uGamma.value = p.gamma;
    program.uniforms.uSaturation.value = p.saturation;
    (program.uniforms.uCenterOffset.value as Float32Array).set([p.centerX, p.centerY]);
    program.uniforms.uZoom.value = p.zoom;
    (program.uniforms.uColor1.value as Float32Array).set(hexToRgb(p.color1));
    (program.uniforms.uColor2.value as Float32Array).set(hexToRgb(p.color2));
    (program.uniforms.uColor3.value as Float32Array).set(hexToRgb(p.color3));
  }, []);

  // Update ref when props change
  useEffect(() => {
    propsRef.current = {
      timeSpeed, colorBalance, warpStrength, warpFrequency, warpSpeed,
      warpAmplitude, blendAngle, blendSoftness, rotationAmount, noiseScale,
      grainAmount, grainScale, grainAnimated, contrast, gamma, saturation,
      centerX, centerY, zoom, color1, color2, color3,
    };
    updateUniforms();
  }, [
    timeSpeed, colorBalance, warpStrength, warpFrequency, warpSpeed,
    warpAmplitude, blendAngle, blendSoftness, rotationAmount, noiseScale,
    grainAmount, grainScale, grainAnimated, contrast, gamma, saturation,
    centerX, centerY, zoom, color1, color2, color3, updateUniforms,
  ]);

  // Setup WebGL context once
  useEffect(() => {
    if (!containerRef.current || mountedRef.current) return;
    mountedRef.current = true;

    let raf = 0;
    let canvas: HTMLCanvasElement | null = null;
    let ro: ResizeObserver | null = null;
    let disposed = false;

    (async () => {
      const { Renderer, Program, Mesh, Triangle } = await import("ogl");

      if (disposed) return;
      const container = containerRef.current;
      if (!container) return;

      const p = propsRef.current;
      const renderer = new Renderer({
        webgl: 2,
        alpha: true,
        antialias: false,
        dpr: Math.min(window.devicePixelRatio || 1, 2),
      });

      const gl = renderer.gl;
      canvas = gl.canvas as HTMLCanvasElement;
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.display = "block";
      container.appendChild(canvas);

      const geometry = new Triangle(gl);
      const program = new Program(gl, {
        vertex,
        fragment,
        uniforms: {
          iTime: { value: 0 },
          iResolution: { value: new Float32Array([1, 1]) },
          uTimeSpeed: { value: p.timeSpeed },
          uColorBalance: { value: p.colorBalance },
          uWarpStrength: { value: p.warpStrength },
          uWarpFrequency: { value: p.warpFrequency },
          uWarpSpeed: { value: p.warpSpeed },
          uWarpAmplitude: { value: p.warpAmplitude },
          uBlendAngle: { value: p.blendAngle },
          uBlendSoftness: { value: p.blendSoftness },
          uRotationAmount: { value: p.rotationAmount },
          uNoiseScale: { value: p.noiseScale },
          uGrainAmount: { value: p.grainAmount },
          uGrainScale: { value: p.grainScale },
          uGrainAnimated: { value: p.grainAnimated ? 1.0 : 0.0 },
          uContrast: { value: p.contrast },
          uGamma: { value: p.gamma },
          uSaturation: { value: p.saturation },
          uCenterOffset: { value: new Float32Array([p.centerX, p.centerY]) },
          uZoom: { value: p.zoom },
          uColor1: { value: new Float32Array(hexToRgb(p.color1)) },
          uColor2: { value: new Float32Array(hexToRgb(p.color2)) },
          uColor3: { value: new Float32Array(hexToRgb(p.color3)) },
        },
      });

      programRef.current = program;
      const mesh = new Mesh(gl, { geometry, program });

      const setSize = () => {
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const width = Math.max(1, Math.floor(rect.width));
        const height = Math.max(1, Math.floor(rect.height));
        renderer.setSize(width, height);
        const res = program.uniforms.iResolution.value as Float32Array;
        res[0] = gl.drawingBufferWidth;
        res[1] = gl.drawingBufferHeight;
      };

      ro = new ResizeObserver(setSize);
      ro.observe(container);
      setSize();

      const t0 = performance.now();
      const loop = (t: number) => {
        if (disposed) return;
        program.uniforms.iTime.value = (t - t0) * 0.001;
        renderer.render({ scene: mesh });
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro?.disconnect();
      programRef.current = null;
      if (canvas && containerRef.current) {
        try {
          containerRef.current.removeChild(canvas);
        } catch {
          // ignore
        }
      }
    };
  }, [updateUniforms]);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden ${className}`.trim()}
    />
  );
}
