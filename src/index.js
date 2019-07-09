const path = require("path");

const tfjsObjectDetection = require("tfjs-object-detection-node");

const Flows = require("./unifi/flows").Flows;
const Unifi = require("./unifi/unifi").Unifi;

/*
Configuration example
See the readme for detailed information

"platforms": [
    {
        "platform": "Unifi-Protect-Motion",
        "name": "display-name",
        "room": "room-name",
        "controller": "https://url-to-controller:7443",
        "username": "user@domain.tld",
        "password": "password",
        "motionscore": 50,
        "motioninterval": 15000,
        "smartdetect": true,
        "detectionthreshold": 30,
        "detectionclasses": ["person", "cat", "dog"],
        "delay": 500,
        "retries": 2
    }
]
*/

let Accessory, Service, Characteristic, UUIDGen;

module.exports = function (homebridge) {
    Accessory = homebridge.platformAccessory;

    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    UUIDGen = homebridge.hap.uuid;

    homebridge.registerPlatform('homebridge-unifi-protect-motion', 'Unifi-Protect-Motion', UnifiProtectMotionPlatform, true);
};

function UnifiProtectMotionPlatform(log, config, api) {
    log('Unifi-Protect-Motion Platform Init');
    const platform = this;

    this.log = log;
    this.accessories = [];
    this.detector = null;
    this.classes = config['detectionclasses'];

    this.flows = new Flows(
        new Unifi(
            config['controller'],
            config['motionscore'] ? config['motionscore'] : 50,
            config['motioninterval'] ? config['motioninterval'] : 15000,
            config['delay'] ? config['delay'] : 500,
            config['retries'] ? config['retries'] : 2,
            log
        ),
        config['username'],
        config['password'],
        log
    );

    if (api) {
        platform.api = api;

        platform.api.on('didFinishLaunching', () => {
            platform.log('Platform API loaded!');

            if (platform.accessories.length > 0) {
                platform.log('Accessories restored from cache!');
                platform.flows
                    .authenticationFlow()
                    .then(() => {
                        platform.log('Authenticated, session stored!');
                        return platform.flows.enumerateMotionSensorsFlow();
                    })
                    .then((sensors) => {
                        platform.log('Checking for new and removed sensors...');
                        const toAdd = sensors.filter(function (sensor) {
                            return !platform.accessories.some(function (accessory) {
                                return sensor.id === accessory.context.id;
                            });
                        });
                        const toRemove = platform.accessories.filter(function (accessory) {
                            return !sensors.some(function (sensor) {
                                return accessory.context.id === sensor.id;
                            });
                        });
                        toRemove.forEach((accessory) => {
                            platform.removeAccessory(accessory);
                        });
                        toAdd.forEach((sensor) => {
                            platform.addAccessory(sensor);
                        });

                        platform.log('Done!');
                        return Promise.resolve();
                    })
                    .then(() => {
                        return tfjsObjectDetection.loadCoco(false, path.dirname(require.resolve("tfjs-object-detection-node/package.json")));
                    })
                    .then((detector) => {
                        platform.detector = detector;
                        platform.setMotionCheckInterval(config['motioninterval'] ? config['motioninterval'] : 15000, config['detectpeople'], config['detectionthreshold']);
                        platform.checkMotion(config['smartdetect'], config['detectionthreshold']);
                    })
            } else {
                platform.log('No Accessories in cache, creating...');
                platform.flows
                    .enumerateMotionSensorsFlow()
                    .then((sensors) => {
                        for (const sensor of sensors) {
                            platform.addAccessory(sensor);
                        }
                        platform.log('Done!');

                        return tfjsObjectDetection.loadCoco(false, path.dirname(require.resolve("tfjs-object-detection-node/package.json")));
                    })
                    .then((detector) => {
                        platform.detector = detector;
                        platform.setMotionCheckInterval(config['motioninterval'] ? config['motioninterval'] : 15000, config['detectpeople'], config['detectionthreshold']);
                        platform.checkMotion(config['detectpeople'], config['detectionthreshold']);
                    })
                    .catch((error) => {
                        platform.log("Could not get sensors: " + error);
                    });
            }
        });
    }
}

UnifiProtectMotionPlatform.prototype = {
    setMotionCheckInterval: function (delay, detectPeople, detectionThreshold) {
        setInterval(this.checkMotion.bind(this, detectPeople, detectionThreshold), delay);
    },

    checkMotion: function (useSmartDetect, detectionThreshold) {
        const platform = this;

        platform.flows.detectMotionFlow(platform.accessories).then((accessoriesWithMotionInfo) => {
            for (const accessoryWithMotionInfo of accessoriesWithMotionInfo) {

                if (useSmartDetect && accessoryWithMotionInfo.context.hasMotion) {
                    tfjsObjectDetection.createImage('http://' + accessoryWithMotionInfo.context.ip + '/snap.jpeg')
                        .then((image) => {
                            return platform.detector.detect(image);
                        })
                        .then((results) => {
                            let personDetected = false;
                            for (const result of results) {
                                if (platform.classes.includes(result.class) && result.score > (detectionThreshold / 100)) {
                                    personDetected = true;
                                    break;
                                }
                            }
                            accessoryWithMotionInfo
                                .getService(Service.MotionSensor)
                                .setCharacteristic(Characteristic.MotionDetected, personDetected);
                        });
                } else {
                    accessoryWithMotionInfo
                        .getService(Service.MotionSensor)
                        .setCharacteristic(Characteristic.MotionDetected, accessoryWithMotionInfo.context.hasMotion);
                }
            }
        });
    },

    addAccessory: function (sensor) {
        const platform = this;

        const uuid = UUIDGen.generate(sensor.name);
        const newAccessory = new Accessory(sensor.name, uuid);

        newAccessory.context = {id: sensor.id, ip: sensor.ip, hasMotion: false};
        newAccessory.addService(Service.MotionSensor, sensor.name);

        platform.api.registerPlatformAccessories('homebridge-unifi-protect-motion', 'Unifi-Protect-Motion', [newAccessory]);
        platform.configureAccessory(newAccessory);
    },

    configureAccessory: function (accessory) {
        const platform = this;
        platform.accessories.push(accessory);

        const id = accessory.context.id;
        platform.log('Configuring ' + id);

        accessory.getService(Service.AccessoryInformation)
            .setCharacteristic(Characteristic.Manufacturer, 'Ubiquiti Networks')
            .setCharacteristic(Characteristic.Model, 'Unifi Protect Camera')
            .setCharacteristic(Characteristic.SerialNumber, id);

        accessory.getService(Service.MotionSensor)
            .getCharacteristic(Characteristic.MotionDetected)
            .on('get', (callback) => {
                callback(null, accessory.context.hasMotion);
            });

        accessory.on('identify', function (paired, callback) {
            platform.log(accessory.displayName, "Identify!!!");
            callback();
        });
    },

    removeAccessory: function (accessory) {
        const platform = this;
        platform.log('Deleting for accessory: ' + accessory.displayName);

        if (accessory) {
            platform.api.unregisterPlatformAccessories('homebridge-unifi-protect-motion', 'Unifi-Protect-Motion', [accessory]);
            platform.accessories.splice(platform.accessories.indexOf(accessory), 1);
        }
    }
};
