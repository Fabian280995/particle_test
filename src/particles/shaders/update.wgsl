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
    pointerRadius : f32,
    particleVelM : f32,
}

struct MouseEvent {
    mousePos : vec2<f32>,
    down : f32,
};

// Buffer für Partikel
@binding(0) @group(0) var<uniform> params : SimParams;
@binding(1) @group(0) var<uniform> mouse : MouseEvent;
@binding(2) @group(0) var<storage, read> particlesA : Particles;
@binding(3) @group(0) var<storage, read_write> particlesB : Particles;

// Main-Funktion des Compute Shaders
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) GlobalInvocationID: vec3<u32>) {
    var index = GlobalInvocationID.x;

    var vPos = particlesA.particles[index].pos;
    var vVel = particlesA.particles[index].vel;
    var radius = particlesA.particles[index].radius;
    var mass = particlesA.particles[index].mass;
    var bottom = params.maxH - radius;

    // Berechne die Distanz zwischen Maus und Partikel
    var distanceToMouse = distance(vPos, mouse.mousePos);
    var directionToMouse = mouse.mousePos - vPos;

    // Überprüfe, ob die Maus innerhalb von x Pixeln vom Partikel entfernt ist
    if (distanceToMouse < params.pointerRadius) {
        var direction : f32;
        if (mouse.down == 1.0) {
            direction = 1.0;
        } else {
            direction = -1.0;
        }
        var awayFromMouse = normalize(directionToMouse) * direction;
        vVel += awayFromMouse * params.particleVelM; // Skalierungsfaktor für die Geschwindigkeit
    } else {
        vVel *= 0.99; // Die 0.99 ist ein Dämpfungsfaktor
    }

    // Collision Detection mit den Wänden
    if (vPos.x < radius) {
        vPos.x = radius;
        vVel.x *= -1.0;
    } else if (vPos.x > params.maxW - radius) {
        vPos.x = params.maxW - radius;
        vVel.x *= -1.0;
    } else
    // Collision Detection mit dem Boden und Decke
    if (vPos.y < radius) {
        vPos.y = radius;
        vVel.y *= -1.0;
    } else if (vPos.y > bottom) {
        vPos.y = bottom;
        vVel.y *= -1.0;
    }

    // Collision Detection mit anderen Partikeln
    // for (var i = 0u; i < arrayLength(&particlesA.particles); i++) {
    //     if (i != index) {
    //         var otherPos = particlesA.particles[i].pos;
    //         var otherRadius = particlesA.particles[i].radius;
    //         var otherMass = particlesA.particles[i].mass;

    //         var distance = distance(vPos, otherPos);
    //         var direction = normalize(otherPos - vPos);

    //         if (distance < radius + otherRadius) {
    //             vPos -= direction * (radius + otherRadius - distance);
    //             vVel -= direction * (dot(vVel - particlesA.particles[i].vel, direction)) * (mass / (mass + otherMass));
    //         }
    //     }
    // }

    vPos += vVel * params.deltaT;

    particlesB.particles[index].pos = vPos;
    particlesB.particles[index].vel = vVel;
}
