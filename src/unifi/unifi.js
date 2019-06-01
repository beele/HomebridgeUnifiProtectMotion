const request = require('request-promise-native');

module.exports.Unifi = function (controller, motionScore, motionIntervalDelay, initialBackoffDelay, maxRetries, logger) {
    const me = this;
    me.log = logger;

    me.controller = controller;
    me.motionScore = motionScore;
    me.motionIntervaldelay = motionIntervalDelay;

    me.initialBackoffDelay = initialBackoffDelay;
    me.maxRetries = maxRetries;

    me.pause = (duration) => new Promise(res => setTimeout(res, duration));
    me.backoff = (retries, fn, delay = me.initialBackoffDelay) =>
        fn().catch(err => retries > 1
            ? me.pause(delay).then(() => me.backoff(retries - 1, fn, delay * 2))
            : Promise.reject(err));

    me.authenticate = function (username, password) {
        if (!username || !password) {
            return Promise.reject('Username and password should be filled in!');
        } else {
            const opts = {
                uri: me.controller + '/api/auth',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: {
                    "username": username,
                    "password": password
                },
                json: true,
                strictSSL: false,
                resolveWithFullResponse: true
            };
            return me
                .backoff(me.maxRetries, () => {
                    me.log('Trying to get an authenticated session...');
                    return request.post(opts);
                })
                .then((response) => {
                    if(!response.headers || !response.headers['authorization']) {
                        this.log(response.body);
                        return Promise.reject(response.body);
                    } else {
                        me.log('Authenticated, returning session');
                        const authorization = response.headers['authorization'];

                        return Promise.resolve({
                            authorization,
                            timestamp: Date.now()
                        });
                    }
                });
        }
    };

    me.isSessionStillValid = function (session) {
        //Validity duration for now set at 12 hours!
        if (session) {
            if ((session.timestamp + (12 * 3600 * 1000)) >= Date.now()) {
                return Promise.resolve(session);
            } else {
                me.log('WARNING: Session expired, a new session must be created!');
            }
        } else {
            me.log('WARNING: No previous session found, a new session must be created!');
        }
        return Promise.reject('No valid session');
    };

    me.enumerateMotionSensorsForCameras = function (session) {
        const opts = {
            uri: me.controller + '/api/bootstrap',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + session.authorization
            },
            json: true,
            strictSSL: false,
            resolveWithFullResponse: true
        };

        return me
            .backoff(me.maxRetries, () => {
                me.log('Trying to get the registered cameras...');
                return request.get(opts);
            })
            .then((response) => {
                if(!response.body.cameras) {
                    this.log(response.body);
                    return Promise.reject(response.body);
                } else {
                    me.log('Cameras retrieved, enumerating motion sensors');
                    const cams = response.body.cameras;

                    const sensors = [];
                    for (const cam of cams) {
                        const sensor = {
                            id: cam.id,
                            name: cam.name,
                            ip: cam.host,
                            mac: cam.mac
                        };
                        sensors.push(sensor);
                    }
                    return Promise.resolve(sensors);
                }
            });
    };

    me.detectMotion = function (session, sensors) {
        const endEpoch = Date.now();
        const startEpoch = endEpoch - (me.motionIntervaldelay * 2);

        const opts = {
            uri: me.controller + '/api/events?end=' + endEpoch +'&start=' + startEpoch + '&type=motion',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + session.authorization
            },
            json: true,
            strictSSL: false,
            resolveWithFullResponse: true
        };

        return me
            .backoff(me.maxRetries, () => {
                return request.get(opts);
            })
            .then((response) => {
                if(response.body.error) {
                    this.log(response.body);
                    return Promise.reject(response.body);
                } else {
                    const events = response.body;

                    outer: for (const sensor of sensors) {
                        sensor.motion = false;

                        for (const event of events) {
                            if(sensor.id === event.camera && event.score >= me.motionScore) {
                                sensor.motion = true;
                                continue outer;
                            }
                        }
                    }
                    return Promise.resolve(sensors);
                }
            });
    };
};