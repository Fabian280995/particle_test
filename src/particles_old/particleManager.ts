import { Color } from "../utils/color";
import { Position } from "../utils/position";
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
    for (let i = 0; i < 10000; i++) {
      const particle = new Particle(
        new ParticleType(
          0,
          Math.random() * 2,
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
      if (particle.pos.x > this.width) {
        particle.pos.x = 0;
      } else {
        particle.pos.x += 0.5;
      }
      this.particleRenderer.drawParticle(particle.type, particle.pos);
    }
  }
}
