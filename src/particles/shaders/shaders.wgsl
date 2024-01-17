struct VertexInput {
  @builtin(vertex_index) index: u32,
  @location(0) position: vec2<f32>, // x, y
  @location(1) velocity: vec2<f32>, // vx, vy
  @location(2) radius: f32,
  @location(3) mass: f32,
};
struct VertexOut {
  @builtin(position) clip_space: vec4<f32>,
  @location(0) local_space: vec2<f32>,
  @location(1) color: vec4<f32>,
}

@group(0) @binding(0)
var<uniform> projectionViewMatrix: mat4x4<f32>;

var<private> VERTICES: array<vec2<f32>, 3> = array<vec2<f32>, 3>(
    vec2<f32>(0.0, 2.0),
    vec2<f32>(1.7321, -1.0), // sqrt(3)
    vec2<f32>(-1.7321, -1.0)
);

@vertex
fn vertMain(input: VertexInput) -> VertexOut {
    var output: VertexOut;

    let local_space = VERTICES[input.index];
    
    let world_space: vec2<f32> = local_space * input.radius + input.position;

    // Berechnung der Geschwindigkeitslänge
    let speed = length(input.velocity);

    // Skaliere die Geschwindigkeit und wende eine Sättigungsfunktion an
    let scaledSpeed = min(speed / 20.0, 1.0); // Skalieren und Sättigung

    output.clip_space = projectionViewMatrix * vec4<f32>(world_space, 0.0, 1.0);
    output.local_space = local_space;
    // Umwandeln der skalierten Geschwindigkeit in eine Farbe
    output.color = vec4<f32>(scaledSpeed / 2, 1.0, 1.0 - scaledSpeed, 1.0);
    return output;
}

@fragment
fn fragMain(fragData: VertexOut) -> @location(0) vec4<f32> {
  if dot(fragData.local_space, fragData.local_space) > 1.0 {
    discard;
  }
  return fragData.color;
}