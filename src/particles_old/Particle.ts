import { Position } from "../utils/position";
import { ParticleType } from "./ParticleType";

export class Particle {
  constructor(public type: ParticleType, public pos: Position) {}
}
