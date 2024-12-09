// https://github.com/mrdoob/three.js/blob/master/examples/webgl_custom_attributes_points.html

class StarParticle {
    constructor(lat, long, time) {
        this.lat = lat;
        this.long = long;

        this.vertexShader = `
            attribute float magnitude;
            attribute vec3 customColor;

            varying vec3 vColor;

            void main() {
                vColor = customColor;

                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

                gl_PointSize = clamp(pow(10.0, -0.15 * magnitude) * 10.0, 1.0, 10.0);
            }
        `;

        /*this.fragmentShader = `
            uniform sampler2D texture;

            varying vec3 vColor;
            
            void main() {
                gl_FragColor = vec4(vColor, 1.0);
                gl_FragColor = gl_FragColor * texture2D(texture, gl_PointCoord);
            }
        `;*/

        this.fragmentShader = `
            uniform sampler2D texture;

            varying vec3 vColor;

            vec3 sigmoidFilter(vec3 rgb, float amp) {
                float r = 1.0 / (pow(2.0, -1.0 * amp * (rgb.r - 0.5)) + 1.0);
                float g = 1.0 / (pow(2.0, -1.0 * amp * (rgb.g - 0.5)) + 1.0);
                float b = 1.0 / (pow(2.0, -1.0 * amp * (rgb.b - 0.5)) + 1.0);
                return vec3(r, g, b);
            }

            vec3 tSigmoidFilter(vec3 rgb, float amp) {
                return sigmoidFilter(rgb, amp) - 0.5;
            }

            vec3 inverseSigmoidFilter(vec3 rgb, float amp) {
                float r = (log2(1.0 / rgb.r - 1.0) / (-1.0 * amp)) + 0.5;
                float g = (log2(1.0 / rgb.g - 1.0) / (-1.0 * amp)) + 0.5;
                float b = (log2(1.0 / rgb.b - 1.0) / (-1.0 * amp)) + 0.5;
                return vec3(r, g, b);
            }

            vec3 inverseTSigmoidFilter(vec3 rgb, float amp) {
                return inverseSigmoidFilter(rgb + 0.5, amp);
            }

            vec3 modInvSigmoidFilter(vec3 rgb, float amp) {
                float sigzero = tSigmoidFilter(vec3(0, 0, 0), amp).r;

                return inverseTSigmoidFilter((rgb - 0.5) * sigzero / -0.5, amp);
            }
            
            void main() {
                //gl_FragColor = vec4(modInvSigmoidFilter(vColor, 4.0), 1.0);
                gl_FragColor = vec4(vColor, 1.0);
                gl_FragColor = gl_FragColor * texture2D(texture, gl_PointCoord);
            }
        `;

        var num = starData.length;
        var r = 10000000;

        var positions = new Float32Array(num * 3);
        var colors = new Float32Array(num * 3);
        var magnitudes = new Float32Array(num);

        var vertex = new THREE.Vector3();
        var color = new THREE.Color(0xffffff);

        var gamma = 1;
        var mult = 1;

        var horizontalCoord;

        for(var i = 0; i < num; i++) {
            horizontalCoord = Math.equatorialToHorizontalCoord(starData[i].ra, starData[i].dec, time, this.lat, this.long);

            vertex = Math.horizontalToVector3(horizontalCoord.altitude, horizontalCoord.azimuth, r);

            vertex.toArray(positions, i * 3);

            color.setRGB(Math.pow(starData[i].color.r / 255, gamma) * mult, Math.pow(starData[i].color.g / 255, gamma) * mult, Math.pow(starData[i].color.b / 255, gamma) * mult);

            color.toArray(colors, i * 3);

            magnitudes[i] = starData[i].mag;
        }

        var geometry = new THREE.BufferGeometry();
        geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.addAttribute('customColor', new THREE.BufferAttribute(colors, 3));
        geometry.addAttribute('magnitude', new THREE.BufferAttribute(magnitudes, 1));

        var material = new THREE.ShaderMaterial({
            uniforms: {
                texture: {value: new THREE.TextureLoader().load("mask.png")}
            },

            vertexShader: this.vertexShader,
            fragmentShader: this.fragmentShader,

            blending: THREE.AdditiveBlending,
            transparent: true
        });

        this.mesh = new THREE.Points(geometry, material);
    }

    updateTime(time) {
        var points = this.mesh.geometry.attributes.position;

        var num = starData.length;
        var r = 10000000;

        var positions = new Float32Array(num * 3);

        var vertex = new THREE.Vector3();

        var horizontalCoord;

        for(var i = 0; i < num; i++) {
            horizontalCoord = Math.equatorialToHorizontalCoord(starData[i].ra, starData[i].dec, time, this.lat, this.long);

            vertex = Math.horizontalToVector3(horizontalCoord.altitude, horizontalCoord.azimuth, r);

            vertex.toArray(positions, i * 3);
        }

        points.array = positions;
        
        points.needsUpdate = true;
    }
}

