// Definiert die Struktur eines Partikels
struct Particle {
    x: f32,
    y: f32,
    vel: vec2<f32>,
    radius: f32,
};

struct Particles {
    particles: array<Particle>,
};

struct SimParams {
    deltaT: f32,
    maxW: f32,
    maxH: f32,
}
// Definiere die Erdanziehungskraft als Konstante
const gravity: f32 = 9.81; 

// Buffer für Partikel
@binding(0) @group(0) var<uniform> params : SimParams;
@binding(1) @group(0) var<storage, read> particlesA : Particles;
@binding(2) @group(0) var<storage, read_write> particlesB : Particles;

// Main-Funktion des Compute Shaders
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) GlobalInvocationID: vec3<u32>) {
    let index = GlobalInvocationID.x;
    
    // Partikel auslesen
    // var x = particlesA.particles[index].x;
    // var y = particlesA.particles[index].y;
    // var radius = particlesA.particles[index].radius;

    // Position des Partikels
    // var vPos = vec2<f32>(x, y);
    // vPos.y += 0.1;
    
    // Partikel schreiben
    // particlesB.particles[index].x = vPos.x;
    // particlesB.particles[index].y = vPos.y;
}
