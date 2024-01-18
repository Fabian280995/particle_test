import { ParticleRenderer } from "./particles/particle-renderer";
import { MouseEventHandler } from "./utils/mouseEventHandler";

export class Renderer {
  private context!: GPUCanvasContext;
  private adapter!: GPUAdapter;
  private device!: GPUDevice;
  private format!: GPUTextureFormat;

  public particleRenderer!: ParticleRenderer;

  public onUpdate = () => {};

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

    this.particleRenderer = new ParticleRenderer(
      this.device,
      this.canvas.width,
      this.canvas.height,
      this.format
    );
    this.particleRenderer.initialize();
  }

  render() {
    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const computePassDescriptor: GPUComputePassDescriptor = {
      label: "compute pass",
    };
    const renderPassDescriptor: GPURenderPassDescriptor = {
      label: "render pass",
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    };

    this.onUpdate();

    // compute pass
    const computePassEncoder = commandEncoder.beginComputePass(
      computePassDescriptor
    );
    this.particleRenderer.computeFrame(computePassEncoder);
    computePassEncoder.end();

    // render pass
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    this.particleRenderer.renderFrame(passEncoder);
    passEncoder.end();

    this.device.queue.submit([commandEncoder.finish()]);

    window.requestAnimationFrame(() => this.render());
  }
}
