// ---- define RoverCamera class ----
// ~ this class acts as the rover exploring earth.
// ~ pass a Mesh instance and the latitude, longitude for the camera to be on.
class RoverCamera extends THREE.PerspectiveCamera {
    // ---- constructor ----
    constructor(fov, aspect, near, far, lat, long, ground) {
        super(fov, aspect, near, far);

        this.height = 100;

        this.lat = lat;
        this.long = long;

        this.yaw = 0;
        this.pitch = 0;
        this.up.set(0, 0, 1);
        this.facing = new THREE.Vector3(0, 1, 0);
        this.updateAngle();

        if(ground === undefined) { return; }
        this.setGroundMesh(ground);
    }

    // ---- angle-related functions ----
    updateAngle() {
        if(this.pitch > Math.PI / 2) { this.pitch = Math.PI / 2; }
        else if(this.pitch < - Math.PI / 4) { this.pitch = - Math.PI / 4; }

        var yawVec = new THREE.Vector3(Math.sin(this.yaw), Math.cos(this.yaw), 0);
        this.facing.copy(yawVec);

        var vecHeight = Math.tan(this.pitch);
        var v = new THREE.Vector3(yawVec.x, yawVec.y, vecHeight);
        v.normalize();
        v.add(this.position);
        this.lookAt(v);
    }

    face(deg) {
        this.yaw = Math.radians(deg);
        this.updateAngle();
    }

    lookUp(deg) {
        this.pitch =  Math.radians(deg);
        this.updateAngle();
    }

    // ---- position-related functions ----
    goTo(x, y) { // same as goToLatLong, but world version
        if(!this.ground) { console.log('not ready!'); return; }

        var latlong = this.ground.geometry.coordToLatlong(x, y);
        this.goToLatLong(latlong[0], latlong[1]);
    }

    forward(dist) {
        if(!this.ground) { console.log('not ready!'); return; }

        var updatedPos = new THREE.Vector3().copy(this.position);
        var vec = new THREE.Vector3().copy(this.facing);
        vec.multiplyScalar(dist);
        updatedPos.add(vec);
        
        this.goTo(updatedPos.x, updatedPos.y);
    }

    // ---- geo-related functions ----
    setGroundMesh(ground) { // setter for ground
        this.ground = ground;
        this.goToLatLong(this.lat, this.long);
    }

    setGroundGeometry(ground) { // setter for ground
        var material = new THREE.MeshBasicMaterial();
        var groundMesh = new THREE.Mesh(ground, material)
        this.ground = groundMesh;
        this.goToLatLong(this.lat, this.long);
    }

    goToLatLong(lat, long) { // go to position on earth
        if(!this.ground) { console.log('not ready!'); return; }

        var intersection = this.ground.geometry.raycastLatLong(lat, long);
        
        this.position.copy(intersection);
        this.position.z += this.height;
    }
}