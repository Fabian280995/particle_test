import { Position } from "./position";

export class MouseEventHandler {
  private leftDown: boolean = false;
  private mousePosition: Position;

  public static mouseBufferSize = new Float32Array(
    3 * Float32Array.BYTES_PER_ELEMENT
  ); // mousPos(x, y), leftDown(boolean)

  constructor(
    public device: GPUDevice,
    public canvas: HTMLCanvasElement,
    callback: () => void
  ) {
    this.mousePosition = new Position(
      this.canvas.width + 1000,
      this.canvas.height + 1000
    );
    this.canvas.addEventListener("mousemove", (e) => {
      this.mousePosition = new Position(e.clientX, e.clientY);
      callback();
    });

    this.canvas.addEventListener("mousedown", (_e) => {
      this.leftDown = true;
    });

    this.canvas.addEventListener("mouseup", (_e) => {
      this.leftDown = false;
    });
  }

  public isMouseDown(): boolean {
    return this.leftDown;
  }

  public getMousePos(): Position {
    return this.mousePosition;
  }
}
