import { Position } from "../utils/posititon";
import { ParticleType } from "./ParticleType";

export class Particle {
  constructor(public type: ParticleType, public pos: Position) {}
}
