import { BufferUtil } from "../utils/buffer-util";
import { Camera } from "../utils/camera";
import { MouseEventHandler } from "../utils/mouseEventHandler";
import { Position } from "../utils/position";
import { Velocity } from "../utils/velocity";
import { ParticleManager } from "./particle-manager";

import shaderSrc from "./shaders/shaders.wgsl?raw";
import updateWGSL from "./shaders/update.wgsl?raw";
import { SimulationParameters } from "./sim-params";

const PARTICLE_NUM = 10000;
const FLOATS_PER_PARTICLE = 6;

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

  private simParamsBuffer!: GPUBuffer;
  private mousePosBuffer!: GPUBuffer;

  private initialParticleData: Float32Array = new Float32Array(
    PARTICLE_NUM * FLOATS_PER_PARTICLE
  );

  private frame = 0;

  /*   private mousePos = new Position(this.width + 1000, this.height + 1000);
   */
  private simParams!: SimulationParameters;

  constructor(
    private device: GPUDevice,
    private width: number,
    private height: number,
    private format: GPUTextureFormat
  ) {
    this.camera = new Camera(this.width, this.height);
    this.particleManager = new ParticleManager();
    this.simParams = new SimulationParameters(this.width, this.height, () =>
      this.updateSimParams()
    );
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
        vel: new Velocity(0, 0),
        radius: 1,
        mass: 1,
      });
    }
    console.log(this.particleManager.particles);

    this._createPipeline();
    this._initParticles();
    this._initBindGroups();
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
            type: "uniform",
          },
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: {
            type: "read-only-storage",
          },
        },
        {
          binding: 3,
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

  public _initParticles() {
    this.initialParticleData =
      this.particleManager.getParticleDataArray(FLOATS_PER_PARTICLE);
  }

  public _initBindGroups() {
    console.log(this.initialParticleData);

    this.simParamsBuffer = this.device.createBuffer({
      label: `Sim Params Buffer`,
      size: this.simParams.bufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.updateSimParams();

    this.mousePosBuffer = this.device.createBuffer({
      label: `Mouse Pos Buffer`,
      size: MouseEventHandler.mouseBufferSize.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.updateMouseEvents(
      new Position(this.width + 1000, this.height + 1000),
      false
    );

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
              buffer: this.mousePosBuffer,
            },
          },
          {
            binding: 2,
            resource: {
              buffer: this.particleBuffers[i],
              offset: 0,
              size: this.initialParticleData.byteLength,
            },
          },
          {
            binding: 3,
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

  public updateSimParams = () => {
    const bufferData = this.simParams.getBufferData();
    this.device.queue.writeBuffer(
      this.simParamsBuffer,
      0,
      bufferData.buffer,
      bufferData.byteOffset,
      bufferData.byteLength
    );
  };

  /* public updateMousePos = (e: MouseEvent) => {
    this.mousePos.x = e.clientX;
    this.mousePos.y = e.clientY;

    this.device.queue.writeBuffer(
      this.mousePosBuffer,
      0,
      new Float32Array([this.mousePos.x, this.mousePos.y]).buffer,
      0,
      8
    );
  }; */

  public updateMouseEvents = (pos: Position, leftDown: boolean) => {
    const mouse = new Float32Array([pos.x, pos.y, leftDown ? 1.0 : 0.0]);

    this.device.queue.writeBuffer(
      this.mousePosBuffer,
      0,
      mouse.buffer,
      0,
      mouse.byteLength
    );
  };

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
