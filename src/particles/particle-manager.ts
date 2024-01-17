import { Particle } from "./Particle";

export class ParticleManager {
  public particles: Particle[] = [];

  public addParticle = (particle: Particle) => {
    this.particles.push(particle);
  };

  public getParticleDataArray = (floatsPerParticle: number) => {
    const data = new Float32Array(this.particles.length * floatsPerParticle);
    this.particles.forEach((particle, index) => {
      const baseIndex = index * floatsPerParticle;
      data[baseIndex + 0] = particle.pos.x;
      data[baseIndex + 1] = particle.pos.y;
      data[baseIndex + 2] = particle.vel.x;
      data[baseIndex + 3] = particle.vel.y;
      data[baseIndex + 4] = particle.radius;
      data[baseIndex + 5] = particle.mass;
    });
    return data;
  };
}
