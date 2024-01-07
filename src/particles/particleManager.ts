import { Color } from "../utils/color";
import { Position } from "../utils/posititon";
import { Particle } from "./Particle";
import { ParticleType } from "./ParticleType";
import { ParticlesRenderer } from "./particlesRenderer";

export class ParticleManager {
  private particles: Array<Particle> = [];

  constructor(
    private particleRenderer: ParticlesRenderer,
    private width: number,
    private height: number
  ) {
    for (let i = 0; i < 1000; i++) {
      const particle = new Particle(
        new ParticleType(
          0,
          Math.random() * 6,
          new Color(Math.random() * 0.5 + 0.5, 1, 1)
        ),
        new Position(Math.random() * this.width, Math.random() * this.height)
      );
      this.particles.push(particle);
    }
  }

  public draw() {
    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      this.particleRenderer.drawParticle(particle.type, particle.pos);
    }
  }
}
