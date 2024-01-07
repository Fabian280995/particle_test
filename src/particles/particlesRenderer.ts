import { BufferUtil } from "../utils/buffer-util";
import { Camera } from "../utils/camera";
import { Color } from "../utils/color";
import { Position } from "../utils/posititon";
import { Particle } from "./Particle";
import { ParticleType } from "./ParticleType";
import { ParticlePipeline } from "./particlePipeline";

const NUMBER_OF_PARTICLES = 1000;
const FLOATS_PER_PARTICLE = 6;

export class ParticleDrawCall {
  constructor(public pipeline: ParticlePipeline) {}
  public instanceData = new Float32Array(
    NUMBER_OF_PARTICLES * FLOATS_PER_PARTICLE
  );
  public instanceCount = 0;
}

export class ParticlesRenderer {
  private currentParticleType: ParticleType | null = null;

  private renderPass!: GPURenderPassEncoder;
  private projectionViewMatrixBuffer!: GPUBuffer;

  private camera: Camera;

  private pipelinesPerParticleType: { [id: string]: ParticlePipeline } = {};

  private drawCallsPerParticleType: { [id: string]: Array<ParticleDrawCall> } =
    {};

  // The buffers which are currently allocated and used for vertex data.
  private allocatedInstanceBuffers: Array<GPUBuffer> = [];

  public particles: Array<Particle> = [];

  constructor(
    private device: GPUDevice,
    private width: number,
    private height: number,
    private format: GPUTextureFormat = "bgra8unorm"
  ) {
    this.camera = new Camera(this.width, this.height);
  }

  public intialize() {
    this.projectionViewMatrixBuffer = BufferUtil.createUniformBuffer(
      this.device,
      new Float32Array(16)
    );
  }

  public framePass(renderPass: GPURenderPassEncoder) {
    this.renderPass = renderPass;

    this.drawCallsPerParticleType = {};
    this.currentParticleType = null;

    this.camera.update();

    this.device.queue.writeBuffer(
      this.projectionViewMatrixBuffer,
      0,
      this.camera.projectionViewMatrix as Float32Array
    );
  }

  public drawParticle(particleType: ParticleType, pos: Position) {
    if (this.currentParticleType !== particleType) {
      this.currentParticleType = particleType;

      let pipeline = this.pipelinesPerParticleType[particleType.id];

      if (!pipeline) {
        pipeline = ParticlePipeline.create(
          this.device,
          this.format,
          this.projectionViewMatrixBuffer
        );
        this.pipelinesPerParticleType[particleType.id] = pipeline;
      }

      let drawCalls = this.drawCallsPerParticleType[particleType.id];
      if (!drawCalls) {
        this.drawCallsPerParticleType[particleType.id] = [];
      }
    }

    const particleDrawCalls = this.drawCallsPerParticleType[particleType.id];
    let drawCall = particleDrawCalls[particleDrawCalls.length - 1];
    if (!drawCall) {
      drawCall = new ParticleDrawCall(
        this.pipelinesPerParticleType[particleType.id]
      );
      this.drawCallsPerParticleType[particleType.id].push(drawCall);
    }

    let i = drawCall.instanceCount * FLOATS_PER_PARTICLE;

    // Instance data
    drawCall.instanceData[0 + i] = pos.x;
    drawCall.instanceData[1 + i] = pos.y;
    drawCall.instanceData[2 + i] = particleType.radius;
    drawCall.instanceData[3 + i] = particleType.color.r;
    drawCall.instanceData[4 + i] = particleType.color.g;
    drawCall.instanceData[5 + i] = particleType.color.b;

    drawCall.instanceCount++;
    if (drawCall.instanceCount >= NUMBER_OF_PARTICLES) {
      const newDrawCall = new ParticleDrawCall(
        this.pipelinesPerParticleType[particleType.id]
      );
      this.drawCallsPerParticleType[particleType.id].push(newDrawCall);
    }
  }

  public frameEnd() {
    let usedInstanceBuffers = [];

    for (const key in this.drawCallsPerParticleType) {
      const arrayOfDrawCalls = this.drawCallsPerParticleType[key];

      for (const drawCall of arrayOfDrawCalls) {
        if (drawCall.instanceCount == 0) {
          continue;
        }

        let instanceBuffer = this.allocatedInstanceBuffers.pop();
        if (!instanceBuffer) {
          instanceBuffer = BufferUtil.createVertexBuffer(
            this.device,
            drawCall.instanceData
          );
        } else {
          this.device.queue.writeBuffer(
            instanceBuffer,
            0,
            drawCall.instanceData
          );
        }
        usedInstanceBuffers.push(instanceBuffer);
        const particlePipeline = drawCall.pipeline;

        this.renderPass.setPipeline(particlePipeline.pipeline);
        this.renderPass.setVertexBuffer(0, instanceBuffer);
        this.renderPass.setBindGroup(
          0,
          particlePipeline.projectionViewBindGroup
        );
        this.renderPass.draw(3, drawCall.instanceCount);
      }
    }

    for (let instanceBuffer of usedInstanceBuffers) {
      this.allocatedInstanceBuffers.push(instanceBuffer);
    }

    console.log("PIPLINES_PER_TEXTURE: ", this.pipelinesPerParticleType);
    console.log(
      "BATCH_DRAW_CALLS_PER_TEXTURE: ",
      this.drawCallsPerParticleType
    );
    console.log("ALLOCATED_VERTEX_BUFFERS: ", this.allocatedInstanceBuffers);
  }
}
