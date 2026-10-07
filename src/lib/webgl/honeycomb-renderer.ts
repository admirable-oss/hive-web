import type { HeroSignals } from "../hero-signals";

/**
 * Ray-cast a ground plane under a low camera, wrap it in a hex grid that
 * rides a rolling height field, and light only the cell edges. Output is
 * premultiplied alpha so the CSS background shows through.
 */
const FRAGMENT_BODY = /* glsl */ `
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uIntro;
uniform vec3 uRipple;
uniform float uPulse;
uniform float uIntensity;

float h21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

// Nearest hex cell: xy = local offset, zw = cell id.
vec4 hexCell(vec2 p) {
  const vec2 s = vec2(1.0, 1.7320508);
  vec4 hc = floor(vec4(p, p - vec2(0.5, 1.0)) / s.xyxy) + 0.5;
  vec4 h = vec4(p - hc.xy * s, p - (hc.zw + 0.5) * s);
  return dot(h.xy, h.xy) < dot(h.zw, h.zw) ? vec4(h.xy, hc.xy) : vec4(h.zw, hc.zw + 0.5);
}

float hexEdge(vec2 p) {
  p = abs(p);
  return max(dot(p, vec2(0.5, 0.8660254)), p.x);
}

float terrain(vec2 g) {
  return 0.55 * sin(g.x * 0.32 + uTime * 0.35)
       + 0.45 * sin(g.y * 0.26 - uTime * 0.28 + g.x * 0.12)
       + 0.22 * sin((g.x + g.y) * 0.6 + uTime * 0.5);
}

vec4 shade() {
  vec2 fc = gl_FragCoord.xy;
  vec2 uv = (fc - 0.5 * uRes) / uRes.y;
  vec3 ro = vec3((uMouse.x - 0.5) * 0.5, 1.25 + (uMouse.y - 0.5) * 0.12, 0.0);
  vec3 rd = normalize(vec3(uv.x, uv.y - 0.30, 1.35));
  if (rd.y >= -0.002) return vec4(0.0);

  float t = -ro.y / rd.y;
  vec3 p = ro + rd * t;
  vec2 g = p.xz + vec2(0.0, uTime * 0.16);

  float h0 = terrain(g);
  vec2 grad = vec2(terrain(g + vec2(0.08, 0.0)) - h0, terrain(g + vec2(0.0, 0.08)) - h0) / 0.08;

  vec4 h = hexCell((g - grad * 0.35) * 1.1);
  float e = hexEdge(h.xy);
  float fw = fwidth(e) * 1.2;
  float line = 1.0 - smoothstep(0.03 - fw, 0.03 + fw, 0.5 - e);

  vec3 n = normalize(vec3(-grad.x * 0.9, 1.0, -grad.y * 0.9));
  float lit = clamp(dot(n, normalize(vec3(-0.3, 0.8, -0.6))) * 1.1, 0.0, 1.0);
  float ridge = clamp(h0 * 0.45 + 0.55, 0.0, 1.0);
  float fog = exp(-t * 0.075) * smoothstep(0.0, 0.07, -rd.y);
  float near = smoothstep(0.0, 0.3, fc.y / uRes.y);
  float cell = step(0.978, h21(h.zw + floor(uTime * 0.25))) * (0.5 + 0.5 * sin(uTime * 2.0 + h21(h.zw) * 6.28));

  float rip = 0.0;
  if (uRipple.z > -5.0) {
    vec2 rq = (fc / uRes - uRipple.xy) * vec2(uRes.x / uRes.y, 1.0);
    float age = uTime - uRipple.z;
    rip = exp(-pow((length(rq) - age * 0.55) * 10.0, 2.0)) * exp(-age * 1.4);
  }

  float a = line * (0.09 + 0.30 * lit * ridge + 0.25 * rip + uPulse * 0.12) + (1.0 - line) * cell * 0.03;
  a = clamp(a * fog * near * uIntro * uIntensity, 0.0, 1.0);
  return vec4(vec3(0.93, 0.92, 0.89) * a, a);
}
`;

const SOURCES = {
  webgl2: {
    vs: "#version 300 es\nin vec2 p;void main(){gl_Position=vec4(p,0.,1.);}",
    fs: `#version 300 es\nprecision highp float;\nout vec4 outColor;\n${FRAGMENT_BODY}\nvoid main(){outColor=shade();}`,
  },
  webgl1: {
    vs: "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}",
    fs: `#extension GL_OES_standard_derivatives : enable\nprecision highp float;\n${FRAGMENT_BODY}\nvoid main(){gl_FragColor=shade();}`,
  },
};

const UNIFORMS = ["uRes", "uTime", "uMouse", "uIntro", "uRipple", "uPulse", "uIntensity"] as const;
type UniformName = (typeof UNIFORMS)[number];

/**
 * Minimal single-pass WebGL renderer for the hero terrain: one program, one
 * oversized triangle, seven uniforms. ~2 KB instead of a 3D engine.
 * `create()` returns null when WebGL is unavailable.
 */
export class HoneycombRenderer {
  private constructor(
    private canvas: HTMLCanvasElement,
    private gl: WebGLRenderingContext | WebGL2RenderingContext,
    private program: WebGLProgram,
    private buffer: WebGLBuffer,
    private u: Record<UniformName, WebGLUniformLocation | null>,
  ) {}

  static create(canvas: HTMLCanvasElement): HoneycombRenderer | null {
    const opts: WebGLContextAttributes = {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false, // edges are anti-aliased in the shader via fwidth()
      depth: false,
      stencil: false,
      powerPreference: "low-power",
    };
    let gl: WebGLRenderingContext | WebGL2RenderingContext | null = canvas.getContext("webgl2", opts);
    let src = SOURCES.webgl2;
    if (!gl) {
      gl = canvas.getContext("webgl", opts);
      src = SOURCES.webgl1;
      if (gl && !gl.getExtension("OES_standard_derivatives")) gl = null;
    }
    if (!gl) return null;

    const compile = (type: number, source: string) => {
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, source);
      gl.compileShader(s);
      if (gl.getShaderParameter(s, gl.COMPILE_STATUS)) return s;
      if (import.meta.env.DEV) console.warn("[honeycomb]", gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    };
    const vs = compile(gl.VERTEX_SHADER, src.vs);
    const fs = compile(gl.FRAGMENT_SHADER, src.fs);
    const program = gl.createProgram();
    if (!vs || !fs || !program) return null;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    if (!buffer) return null;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.clearColor(0, 0, 0, 0);

    const u = Object.fromEntries(UNIFORMS.map((n) => [n, gl.getUniformLocation(program, n)])) as Record<
      UniformName,
      WebGLUniformLocation | null
    >;
    return new HoneycombRenderer(canvas, gl, program, buffer, u);
  }

  /** Match the drawing buffer to the canvas' CSS size × dpr. */
  resize(cssWidth: number, cssHeight: number, dpr: number) {
    const w = Math.max(1, Math.round(cssWidth * dpr));
    const h = Math.max(1, Math.round(cssHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  render(s: HeroSignals, intensity: number) {
    const { gl, u, canvas } = this;
    if (gl.isContextLost()) return;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(u.uRes, canvas.width, canvas.height);
    gl.uniform1f(u.uTime, s.t);
    gl.uniform2f(u.uMouse, s.mx, s.my);
    gl.uniform1f(u.uIntro, s.intro);
    gl.uniform3f(u.uRipple, s.ripple[0], s.ripple[1], s.ripple[2]);
    gl.uniform1f(u.uPulse, s.pulse);
    gl.uniform1f(u.uIntensity, intensity);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  dispose() {
    const { gl } = this;
    gl.deleteBuffer(this.buffer);
    gl.deleteProgram(this.program);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}
