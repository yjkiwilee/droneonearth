// ---- simple class for tile data storage ----
class Tile {
    constructor(lat, long, tile) {
        lat = Math.floor(lat);
        long = Math.floor(long);

        if(tile) {
            this.lat = lat + tile.lat;
            this.long = long + tile.long;
        } else {
            this.lat = lat;
            this.long = long;
        }
    }

    getStr() {
        var latpt = (this.lat > 0 ? "N" : "S") + this.lat.toString();
        var longpt = (this.long > 0 ? "E" : "W") + this.long.toString();
        return ELV_PATH + latpt + longpt + ".hgt";
    }
}

// ---- define GroundGeometry class ----
// ~ disclaimer on the coordinate system
// ~ 1 metre corresponds to 1 'three.js coordinate system length'
// ~ x axis: - => west, + => east
// ~ y axis: - => south, + => north
// ~ z axis: - => down, + => up
// ~ there are RES_GEO * RES_GEO vertices.
class GroundGeometry extends THREE.PlaneBufferGeometry {
    constructor(lat, long, camera) { // both are floored lat, long
        // ---- call super ----
        super(1, 1, RES, RES);

        // ---- ready flag ----
        this.ready = false;

        // ---- set camera for update ----
        this.camera = camera;

        // ---- set constants ----
        this.R = 6371000.0;

        // ---- set tiles to import ----
        // ~ this version of GroundGeometry will load 4 data tiles.
        // ~ the one that the lat/long point is on,
        // ~ and the surrounding 3 tiles.
        // ~ in currTile, the tile that the point is in is saved.
        // ~ and in tiles, 4 tiles are saved in reading order(west -> east, north -> south)

        this.lat = lat;
        this.long = long;

        this.currTile = new Tile(this.lat, this.long);

        var latRem = this.lat - this.currTile.lat;
        var longRem = this.long - this.currTile.long;

        var top = latRem > 1/2 ? 1 : 0;
        var left = longRem <= 1/2 ? -1 : 0;
        
        this.tiles = [
            [
                new Tile(top, left, this.currTile), // north-western tile
                new Tile(top, left + 1, this.currTile) // north-eastern tile
            ], [
                new Tile(top - 1, left, this.currTile), // south-western tile
                new Tile(top - 1, left + 1, this.currTile) // south-eastern tile
            ]
        ];

        // ---- transform vertices to accurately depict earth's surface ----
        // ~ the final vertices map will 'look' trapezoidal.
        // ~ h: height
        // ~ the earth's shape is assumed to be completely spherical,
        // ~ and the radius is 6371km = 6371000m.

        var vertices = this.attributes.position.array;
        this.transformVertices(this.lat + 1/2, this.long - 1/2, this.lat - 1/2, this.long + 1/2, vertices);

        // ---- calculate areas in each tiles to load ---
        // ~ the resulting GroundGeometry will have the matrix size of a tile.
        // ~ with the point(lat, long) at the centre.

        // 'snap' the latlong point into a RES*RES grid. (in the currTile.)
        var snapX = Math.floor((this.long - Math.floor(this.long)) * RES);
        var snapY = 1200 - Math.floor((this.lat - Math.floor(this.lat)) * RES);

        this.onWest = snapX <= RES_HALF;
        this.onNorth = snapY < RES_HALF;

        // find the grid x, y of the corners in their respective tiles.
        var cornerX = snapX + (this.onWest ? RES_HALF : -RES_HALF);
        var cornerY = snapY + (this.onNorth ? RES_HALF : -RES_HALF);
        
        // ---- run xhr ----
        
        var parallelLoad = async function() {
            const NW = this.importData(this.tiles[0][0], cornerX, cornerY, 1200, 1200); // load needed datas from NW tile
            const NE = this.importData(this.tiles[0][1], 0, cornerY, cornerX, 1200); // "
            const SW = this.importData(this.tiles[1][0], cornerX, 0, 1200, cornerY); // "
            const SE = this.importData(this.tiles[1][1], 0, 0, cornerX, cornerY); // "

            return [
                [
                    await NW,
                    await NE
                ],[
                    await SW,
                    await SE
                ]
            ];
        };

        var loadAndEdit = async function() {
            var subtiles = await parallelLoad.bind(this)();

            var mergedArr = this.merge(cornerX, cornerY, subtiles);

            var vertices = this.attributes.position.array;

            //console.log(vertices.toString());

            for(var i = 0; i < mergedArr.length; i++) {
                vertices[3 * i + 2] = mergedArr[i];
            }

            this.attributes.position.needsUpdate = true;
            this.attributes.normal.needsUpdate = true;
            this.attributes.uv.needsUpdate = true;

            this.computeFaceNormals();
            this.computeVertexNormals();
            this.computeBoundingSphere();
            this.computeBoundingBox();

            this.camera.setGroundGeometry(this); // set camera's geometry

            this.ready = true;
        }

        loadAndEdit.bind(this)();
    }

    longToM(longDeg, atLat) { // convert degree-length longDeg to m at latitude atLat
        var r = this.R * Math.cos(Math.radians(Math.abs(atLat))); // radius of cross-section circle
        var c = 2 * Math.PI * r; // circumference of the cross-section
        var l = c / 360 * longDeg; // calculated m
        return l;
    }

    latlongToCoord(lat, long) { // convert lat,long to coordinates in three.js world
        var latCorner = this.lat - 1/2;
        var longCorner = this.long - 1/2;

        var isLatOB = lat < latCorner || lat > latCorner + 1;
        var isLongOB = long < longCorner || long > longCorner + 1;

        if(isLatOB || isLongOB) {throw "out of bounds!"; return;} // if latlong is out of bounds
        var latRemainder = lat - latCorner - 1/2; // -0.5 ~ 0.5
        var longRemainder = long - longCorner - 1/2; // -0.5 ~ 0.5
        var longMult = this.longToM(1, lat); // the map's width

        var x = longRemainder * longMult;
        var y = latRemainder * this.height;
        return [x, y];
    }

    coordToLatlong(x, y) { // convert x,y to latlong
        var latCorner = this.lat - 1/2;
        var longCorner = this.long - 1/2;

        var latRemainder = y / this.height;
        var lat = latRemainder + 1/2 + latCorner;

        var longMult = this.longToM(1, lat); // the map's width
        var longRemainder = x / longMult;
        var long = longRemainder + 1/2 + longCorner;
        return [lat, long];
    }

    // ---- transform vertices to accurately depict earth's surface ----
    // ~ the final vertices map will 'look' trapezoidal.
    // ~ h: height
    // ~ the earth's shape is assumed to be completely spherical,
    // ~ and the radius is 6371km = 6371000m.
    transformVertices(top, left, bottom, right, vertices) {
        var unitH = 2 * Math.PI * this.R / 360;
        var h = unitH * (top - bottom);

        for(var i=0; i < RES_GEO * RES_GEO; i++) {
            // recover x and y coordinates in datamap
            var x = i % RES_GEO;
            var y = (i - x) / RES_GEO;
            // calculate constants
            var latRemainder = 1 - (y / RES_GEO);
            var w = this.longToM(right - left, bottom + latRemainder);
            this.height = h;
            // map the vertex
            vertices[3*i] *= w;
            vertices[3*i + 1] *= this.height;
        }

        return vertices;
    }

    // ---- import elevations from data ----
    // ~ tile is the Tile object with the information of which tile to import.
    // ~ x1, y1 sets the north-west corner of the area whose elevation data will be imported. (0 <= x1,y1 <= 1200)
    // ~ x2, y2 sets the south-east corner of the area whose elevation data will be imported.(inclusive) (x1,y1(respectively) <= x2,y2 <= 1200)
    importData(tile, x1, y1, x2, y2) { // for vertices, the reference is passed.
        return new Promise(function(resolve, reject) {
            
            // construct height datamap request url string
            var reqStr = tile.getStr();

            // make xhr
            var req = new XMLHttpRequest();
            req.open("GET", reqStr);
            req.responseType = "arraybuffer";

            var onload = function() { // afterprocessing

                if(req.status != 404) {

                    var buffer = req.response;

                    if(buffer) {
                        // ---- in this block, the elevations are retrieved and the void data's ids are stored.
                        var dataArr = new Uint8ClampedArray(buffer);
                        var elevations = [];
                        var voids = []; // for 'null' datas

                        for(var y = y1; y <= y2; y++) {
                            for(var x = x1; x <= x2; x++) {
                                var i = y * RES + x;

                                var elevation = 256*dataArr[2*i] + dataArr[2*i + 1]; // retrieve height data from byte array
                                if(elevation > 10000) { // since the data seems to struggle with handling negative numbers, manual adjustments are mandatory
                                    if(elevation == 32768) { // if data is void data,
                                        voids.push(i);
                                    } else { // if data is negative data,
                                        elevation -= 256 * 256;
                                    }
                                }
                                elevations.push(elevation);
                            }
                        }
                        // ---- end of block ----

                        // repeat n times for n+1 depth null data.
                        this.fillVoid(voids, elevations, x2 - x1 + 1, y2 - y1 + 1);
                        voids = this.checkVoid(elevations);
                        this.fillVoid(voids, elevations, x2 - x1 + 1, y2 - y1 + 1);

                        resolve(elevations);
                    } else {
                        console.log("Something went wrong here!");

                        reject('data import error');
                    }
                } else { // if the server responded with 404
                    console.log("404 returned!");
                    var width = x2 - x1 + 1;
                    var height = y2 - y1 + 1;
                    resolve(new Int16Array(width * height).fill(0));
                }
            }

            req.addEventListener("load", onload.bind(this));
            req.send(null);
        }.bind(this));
    }

    checkVoid(elevations) { // check for void datas in elevations and returns a void list (list with all the ids of void datas)
        var voidArr = [];

        for(var i = 0; i < elevations.length; i++) {
            var elevation = elevations[i];
            if(elevation == 32768) { // if point is void, (32768 = 128 * 256 + 0)
                voidArr.push(i);
            }
        }

        return voidArr;
    }

    fillVoid(voidArr, elevations, w = RES, h = RES) { // w, h is the dimension of the elevations space. (if not given, w,h = RES)
        
        var neighbor = [
            [-1, 1], // SE
            [-1, 0], // S
            [-1, -1], // SW
            [0, 1], // E
            [0, -1], // W
            [1, 1], // NE
            [1, 0], // N
            [1, -1] // NW
        ];

        for(var i = 0; i < voidArr.length; i++) {  // for 'void' datas, calculate the mean elevation of the neighbors and set that as the elevation
            var voidIdx = voidArr[i];
            var voidX = voidIdx % w;
            var voidY = Math.floor(voidIdx / w);

            var elevationSum = 0;
            var num = 0;
            
            for(var j = 0; j < neighbor.length; j++) {
                var modX = voidX + neighbor[j][1];
                var modY = voidY + neighbor[j][0];
                var modIdx = modY * w + modX;
                
                var isXOutofbounds = modX < 0 || modX > w - 1;
                var isYOutofbounds = modY < 0 || modY > h - 1;

                if(!isXOutofbounds && !isYOutofbounds) { // the calculated neighbor is not out of bounds
                    if(elevations[modIdx] != 32768) { // the calculated neighbor is not a void data
                        elevationSum += elevations[modIdx];
                        num += 1;
                    }
                }
            }

            if(num != 0) {
                elevations[voidIdx] = elevationSum / num;
            }
        }

        return elevations;
    }

    merge(cornerX, cornerY, tiles) { // merge arrays into a whole array of RES_GEO*RES_GEO = 1444804 items.

        // how many columns are within the left tiles
        var left = RES - cornerX;
        // how many rows are within the top tiles
        var top = RES - cornerY;

        var result = [];

        for(var y = 0; y < RES_GEO; y++) {
            for(var x = 0; x < RES_GEO; x++) {
                var isLeft = x < left;
                var isTop = y < top;

                var xIdx = isLeft ? 0 : 1;
                var yIdx = isTop ? 0 : 1;

                var xInSubTile = isLeft ? x : x - left;
                var yInSubTile = isTop ? y : y - top;

                var i = yInSubTile * (isLeft ? left : RES_GEO - left) + xInSubTile;

                result.push(tiles[yIdx][xIdx][i]);
            }
        }

        return result;
    }
}