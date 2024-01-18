import dat from "dat.gui";

// Initial Simulation Parameters
const DELTA_T = 0.1;
const POINTER_RADIUS = 150;
const PARTICLE_VELOCITY_MULTIPLIER = 6;

export class SimulationParameters {
  public bufferSize = 5 * Float32Array.BYTES_PER_ELEMENT; // All Parameters (+width, +height)

  public deltaT: number = DELTA_T;
  public pointerRadius: number = POINTER_RADIUS;
  public particleVelocityMultiplier: number = PARTICLE_VELOCITY_MULTIPLIER;

  constructor(
    public width: number,
    public height: number,
    private callBack: () => void
  ) {
    this.createGUI();
  }

  createGUI() {
    // Erstelle das GUI-Objekt
    const gui = new dat.GUI();
    const simFolder = gui.addFolder("Simulation");
    simFolder
      .add(this, "deltaT", 0.01, 0.5)
      .step(0.01)
      .name("Delta Time")
      .onChange(this.callBack);

    const mouseFolder = gui.addFolder("Mouse");
    mouseFolder
      .add(this, "pointerRadius", 1, 1000)
      .step(1)
      .name("Pointer Radius")
      .onChange(this.callBack);

    const particleFolder = gui.addFolder("Particle");
    particleFolder
      .add(this, "particleVelocityMultiplier", 0.5, 20)
      .step(0.1)
      .onChange(this.callBack);

    const canvasFolder = gui.addFolder("Canvas");
    canvasFolder.add(this, "width").listen().name("Width");
    canvasFolder.add(this, "height").listen().name("Height");
  }

  public getBufferData() {
    return new Float32Array([
      this.deltaT,
      this.width,
      this.height,
      this.pointerRadius,
      this.particleVelocityMultiplier,
    ]);
  }
}
