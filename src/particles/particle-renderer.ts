import { BufferUtil } from "../utils/buffer-util";
import { Camera } from "../utils/camera";
import { Position } from "../utils/posititon";
import { Velocity } from "../utils/velocity";
import { ParticleManager } from "./particle-manager";

import shaderSrc from "./shaders/shaders.wgsl?raw";
import updateWGSL from "./shaders/update.wgsl?raw";

const PARTICLE_NUM = 10;
const FLOATS_PER_PARTICLE = 6;
const DELTA_T = 0.5;

export class ParticleRenderer {
  private camera: Camera;
  private particleManager!: ParticleManager;

  private renderPipeline!: GPURenderPipeline;
  private computePipeline!: GPUComputePipeline;

  private particleBuffers: GPUBuffer[] = new Array(2);
  private particleBindGroupLayout!: GPUBindGroupLayout;
  private particleBindGroups: GPUBindGroup[] = new Array(2);

  private projectionViewMatrixBuffer!: GPUBuffer;
  private projectionViewBindGroup!: GPUBindGroup;

  private deltaT = DELTA_T;
  private simParamsBuffer!: GPUBuffer;

  private initialParticleData: Float32Array = new Float32Array(
    PARTICLE_NUM * FLOATS_PER_PARTICLE
  );

  private frame = 0;

  constructor(
    private device: GPUDevice,
    private width: number,
    private height: number,
    private format: GPUTextureFormat
  ) {
    this.camera = new Camera(this.width, this.height);
    this.particleManager = new ParticleManager();
  }

  public initialize() {
    this.projectionViewMatrixBuffer = BufferUtil.createUniformBuffer(
      this.device,
      new Float32Array(16)
    );

    for (let i = 0; i < PARTICLE_NUM; i++) {
      this.particleManager.addParticle({
        pos: new Position(
          Math.random() * this.width,
          Math.random() * this.height
        ),
        vel: new Velocity(0, 20),
        radius: 5,
        mass: 1,
      });
    }
    console.log(this.particleManager.particles);

    this._createPipeline();
    this.initParticles();
    this.initBindGroups();
  }

  private _createPipeline() {
    const spriteShaderModule = this.device.createShaderModule({
      code: shaderSrc,
      label: "sprite-shader",
    });

    const instanceBufferLayout: GPUVertexBufferLayout = {
      arrayStride: 24,
      attributes: [
        {
          format: "float32x2", // position / x, y
          offset: 0,
          shaderLocation: 0,
        },
        {
          format: "float32x2", // velocity / x, y
          offset: 2 * Float32Array.BYTES_PER_ELEMENT,
          shaderLocation: 1,
        },
        {
          format: "float32", // radius
          offset: 4 * Float32Array.BYTES_PER_ELEMENT,
          shaderLocation: 2,
        },
        {
          format: "float32", // mass
          offset: 5 * Float32Array.BYTES_PER_ELEMENT,
          shaderLocation: 3,
        },
      ],
      stepMode: "instance",
    };

    const vertexState: GPUVertexState = {
      module: spriteShaderModule,
      entryPoint: "vertMain",
      buffers: [instanceBufferLayout],
    };

    const fragmentState: GPUFragmentState = {
      module: spriteShaderModule,
      entryPoint: "fragMain",
      targets: [
        {
          format: this.format,
        },
      ],
    };

    const projectionViewBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: {
            type: "uniform",
          },
        },
      ],
    });

    this.projectionViewBindGroup = this.device.createBindGroup({
      layout: projectionViewBindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.projectionViewMatrixBuffer,
          },
        },
      ],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [projectionViewBindGroupLayout],
    });

    const pipelineDescriptor: GPURenderPipelineDescriptor = {
      layout: pipelineLayout,
      vertex: vertexState,
      fragment: fragmentState,
      primitive: {
        topology: "triangle-list",
      },
    };

    this.renderPipeline = this.device.createRenderPipeline(pipelineDescriptor);

    this.particleBindGroupLayout = this.device.createBindGroupLayout({
      label: `Particle Bind Group Layout`,
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: {
            type: "uniform",
          },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: {
            type: "read-only-storage",
          },
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: {
            type: "storage",
          },
        },
      ],
    });

    const computeShaderModule = this.device.createShaderModule({
      code: updateWGSL,
    });
    const computePipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [this.particleBindGroupLayout],
    });
    this.computePipeline = this.device.createComputePipeline({
      layout: computePipelineLayout,
      compute: {
        module: computeShaderModule,
        entryPoint: "main",
      },
    });
  }

  public initParticles() {
    this.initialParticleData =
      this.particleManager.getParticleDataArray(FLOATS_PER_PARTICLE);
  }

  public initBindGroups() {
    const simParams = new Float32Array([this.deltaT, this.width, this.height]);

    this.simParamsBuffer = this.device.createBuffer({
      label: `Sim Params Buffer`,
      size: simParams.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.device.queue.writeBuffer(
      this.simParamsBuffer,
      0,
      simParams.buffer,
      simParams.byteOffset,
      simParams.byteLength
    );

    console.log(this.initialParticleData);

    for (let i = 0; i < 2; ++i) {
      this.particleBuffers[i] = this.device.createBuffer({
        label: `Particle Buffer ${i}`,
        size: this.initialParticleData.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE,
        mappedAtCreation: true,
      });
      new Float32Array(this.particleBuffers[i].getMappedRange()).set(
        this.initialParticleData
      );
      this.particleBuffers[i].unmap();
    }

    for (let i = 0; i < 2; ++i) {
      this.particleBindGroups[i] = this.device.createBindGroup({
        layout: this.particleBindGroupLayout,
        entries: [
          {
            binding: 0,
            resource: {
              buffer: this.simParamsBuffer,
            },
          },
          {
            binding: 1,
            resource: {
              buffer: this.particleBuffers[i],
              offset: 0,
              size: this.initialParticleData.byteLength,
            },
          },
          {
            binding: 2,
            resource: {
              buffer: this.particleBuffers[(i + 1) % 2],
              offset: 0,
              size: this.initialParticleData.byteLength,
            },
          },
        ],
      });
    }
  }

  public computeFrame = (computePass: GPUComputePassEncoder) => {
    computePass.setPipeline(this.computePipeline);
    computePass.setBindGroup(0, this.particleBindGroups[this.frame % 2]);
    computePass.dispatchWorkgroups(Math.ceil(PARTICLE_NUM / 64));
  };

  public renderFrame = (renderPass: GPURenderPassEncoder) => {
    this.camera.update();

    this.device.queue.writeBuffer(
      this.projectionViewMatrixBuffer,
      0,
      this.camera.projectionViewMatrix as Float32Array
    );

    renderPass.setPipeline(this.renderPipeline);
    renderPass.setVertexBuffer(0, this.particleBuffers[(this.frame + 1) % 2]);
    renderPass.setBindGroup(0, this.projectionViewBindGroup);
    renderPass.draw(3, PARTICLE_NUM);
    this.frame++;
  };
}
