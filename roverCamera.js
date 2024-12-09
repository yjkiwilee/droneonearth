// ---- define RoverCamera class ----
// ~ this class acts as the rover exploring earth.
// ~ pass a Mesh instance and the latitude, longitude for the camera to be on.
class RoverCamera extends THREE.PerspectiveCamera {
    // ---- constructor ----
    constructor(fov, aspect, near, far, lat, long, ground) {
        super(fov, aspect, near, far);

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
        
        this.lat = lat;
        this.long = long;

        lat -= this.ground.geometry.lat - 1/2;
        long -= this.ground.geometry.long - 1/2;
        
        // ! potential outOfBounds below
        var xIdx = Math.floor(long * RES_GEO);
        var yIdx = Math.floor((1 - lat) * RES_GEO);
        var idx = yIdx * RES_GEO + xIdx;
        
        var vertices = [];
        var origin = this.ground.geometry.attributes.position.array;
        var partWidthSeg = 5;
        var partHeightSeg = 5;
        var widthHlf = Math.floor(partWidthSeg / 2);
        var heightHlf = Math.floor(partHeightSeg / 2);
        for(var y = -heightHlf; y <= heightHlf; y++) { // cut a part out from the geometry
            for(var x = -widthHlf; x <= widthHlf; x++) {
                var modIdx = idx + y * RES_GEO + x;
                
                if(modIdx < 0 || modIdx > RES_GEO*RES_GEO) {continue;} // if out of bounds, skip

                vertices.push(origin[3*modIdx]);
                vertices.push(origin[3*modIdx + 1]);
                vertices.push(origin[3*modIdx + 2]);
            }
        }

        var part = new THREE.PlaneBufferGeometry(1, 1, partWidthSeg - 1, partHeightSeg - 1);
        part.attributes.position.array = vertices;
        part.attributes.position.needsUpdate = true;
        part.attributes.normal.needsUpdate = true;
        part.attributes.uv.needsUpdate = true;
        part.computeFaceNormals();
        part.computeVertexNormals();
        part.computeBoundingSphere();

        var mat = new THREE.MeshBasicMaterial();
        var msh = new THREE.Mesh(part, mat);

        var coord = this.ground.geometry.latlongToCoord(this.lat, this.long);
        var pos = new THREE.Vector3(coord[0], coord[1], 10000); // arbitrary height to raycast

        // ---- set z coordinate using Raycaster ----
        var down = new THREE.Vector3(0, 0, -1);
        var raycaster = new THREE.Raycaster(pos, down);
        var intersection = raycaster.intersectObject(msh)[0].point;
        this.position.copy(intersection);
        this.position.z += 1.7;
    }
}