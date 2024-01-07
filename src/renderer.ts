import { ParticleManager } from "./particles/particleManager";
import { ParticlesRenderer } from "./particles/particlesRenderer";

export class Renderer {
  private context!: GPUCanvasContext;
  private adapter!: GPUAdapter;
  private device!: GPUDevice;
  private format!: GPUTextureFormat;

  private particleRenderer!: ParticlesRenderer;
  private particleManager!: ParticleManager;

  constructor(public canvas: HTMLCanvasElement) {}

  public async initialize() {
    this.context = this.canvas.getContext("webgpu")!;
    if (!this.context) {
      throw new Error("WebGPU is not supported");
    }

    this.adapter = <GPUAdapter>await navigator.gpu.requestAdapter({
      powerPreference: "high-performance",
    });
    if (!this.adapter) {
      throw new Error("Failed to get adapter");
    }

    this.device = <GPUDevice>await this.adapter.requestDevice();
    if (!this.device) {
      throw new Error("Failed to get device");
    }

    this.format =
      <GPUTextureFormat>navigator.gpu.getPreferredCanvasFormat() ||
      "bgra8unorm";

    this.context.configure({
      device: this.device,
      format: this.format,
    });

    this.particleRenderer = new ParticlesRenderer(
      this.device,
      this.canvas.width,
      this.canvas.height,
      this.format
    );
    this.particleRenderer.intialize();
    this.particleManager = new ParticleManager(
      this.particleRenderer,
      this.canvas.width,
      this.canvas.height
    );
  }

  render() {
    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();
    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    };

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

    this.particleRenderer.framePass(passEncoder);

    this.particleManager.draw();

    this.particleRenderer.frameEnd();

    passEncoder.end();
    this.device.queue.submit([commandEncoder.finish()]);

    window.requestAnimationFrame(() => this.render());
  }
}
