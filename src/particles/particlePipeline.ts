import shaderSource from "./shaders/shaders.wgsl?raw";

export class ParticlePipeline {
  public pipeline!: GPURenderPipeline;
  public projectionViewBindGroup!: GPUBindGroup;

  public static create = (
    device: GPUDevice,
    format: GPUTextureFormat,
    projectionViewMatrixBuffer: GPUBuffer
  ) => {
    const pipeline = new ParticlePipeline();
    pipeline.initialize(device, format, projectionViewMatrixBuffer);
    return pipeline;
  };

  public initialize = (
    device: GPUDevice,
    format: GPUTextureFormat,
    projectionViewMatrixBuffer: GPUBuffer
  ) => {
    const shaderModule = device.createShaderModule({
      code: shaderSource,
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
          format: "float32", // radius
          offset: 8,
          shaderLocation: 1,
        },
        {
          format: "float32x3", // color / r, g, b
          offset: 12,
          shaderLocation: 2,
        },
      ],
      stepMode: "instance",
    };

    const vertexState: GPUVertexState = {
      module: shaderModule,
      entryPoint: "vertMain",
      buffers: [instanceBufferLayout],
    };

    const fragmentState: GPUFragmentState = {
      module: shaderModule,
      entryPoint: "fragMain",
      targets: [
        {
          format: format,
        },
      ],
    };

    const projectionViewBindGroupLayout: GPUBindGroupLayout =
      device.createBindGroupLayout({
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

    this.projectionViewBindGroup = device.createBindGroup({
      layout: projectionViewBindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: projectionViewMatrixBuffer,
          },
        },
      ],
    });

    const pipelineLayout = device.createPipelineLayout({
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

    this.pipeline = device.createRenderPipeline(pipelineDescriptor);
  };
}
