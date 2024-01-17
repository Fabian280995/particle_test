import { Position } from "../utils/position";
import { Velocity } from "../utils/velocity";

export class Particle {
  constructor(
    public pos: Position,
    public vel: Velocity,
    public radius: number,
    public mass: number
  ) {}
}
