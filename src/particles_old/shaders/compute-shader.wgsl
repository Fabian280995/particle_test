// Partikel-Datenstruktur
struct Particle {
    position: vec2<f32>;
    velocity: vec2<f32>;
};

// Buffer für Partikeldaten
@group(0) @binding(0)
var<storage, read_write> particles: array<Particle>;

// Zeitdifferenz seit dem letzten Update
@group(0) @binding(1)
var<uniform> deltaT: f32;

// Schwerkraftkonstante
let gravity: vec2<f32> = vec2<f32>(0.0, -9.81);

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let i = id.x;

    if (i < particles.length()) {
        particles[i].velocity += gravity * deltaT;
        particles[i].position += particles[i].velocity * deltaT;

        // Boden-Kollision
        if (particles[i].position.y < 0.0) {
            particles[i].position.y = 0.0;
            particles[i].velocity = vec2<f32>(0.0, 0.0);
        }
    }
}
