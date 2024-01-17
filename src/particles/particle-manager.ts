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
      data[baseIndex + 0] = particle.x;
      data[baseIndex + 1] = particle.y;
      data[baseIndex + 2] = particle.radius;
    });
    return data;
  };
}
