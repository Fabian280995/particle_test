import { Renderer } from "./renderer";

if (!navigator.gpu) {
  console.error("WebGPU is not supported");
}

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
if (!canvas) {
  console.error("Failed to get canvas");
}

const renderer = new Renderer(canvas);

renderer.initialize().then(() => {
  canvas.addEventListener("mousemove", (e: any) => {
    renderer.onUpdate = () => {
      renderer.particleRenderer.updateMousePos(e);
    };
  });

  renderer.render();
});
