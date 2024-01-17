// Definiert die Struktur eines Partikels
struct Particle {
    pos : vec2<f32>,
    vel : vec2<f32>,
    radius : f32,
    mass : f32,
};

struct Particles {
    particles : array<Particle>,
};

struct SimParams {
    deltaT : f32,
    maxW : f32,
    maxH : f32,
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
    var index = GlobalInvocationID.x;

    var vPos = particlesA.particles[index].pos;
    var vVel = particlesA.particles[index].vel;
    var radius = particlesA.particles[index].radius;
    var bottom = params.maxH - radius;
 
    vVel.y += gravity * params.deltaT;
    vPos.y += vVel.y * params.deltaT;
    if (vPos.y >= bottom ) {
        vVel.y = -vVel.y;
        vVel.y *= 0.6;
        vPos.y = bottom;
    } 

    particlesB.particles[index].pos = vPos;
    particlesB.particles[index].vel = vVel;
}
