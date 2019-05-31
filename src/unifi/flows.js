module.exports.Flows = function (unifi, username, password, logger) {
    const me = this;

    me.unifi = unifi;
    me.log = logger;

    me.username = username;
    me.password = password;

    me.session = null;
    me.sensors = null;

    me.authenticationFlow = function () {
        return me.unifi.isSessionStillValid(me.session)
            .catch((reason) => {
                return me.unifi.authenticate(me.username, me.password);
            })
            .then((session) => {
                me.session = session;
                return Promise.resolve();
            })
            .catch((error) => {
                me.log('Authentication failed: ' + JSON.stringify(error, null, 4));
                return Promise.reject('Authentication failed: ' + error);
            });
    };

    me.enumerateMotionSensorsFlow = function() {
        return me.authenticationFlow()
            .then(() => {
                return me.unifi.enumerateMotionSensorsForCameras(me.session);
            })
            .then((sensors) => {
                me.sensors = sensors;
                return Promise.resolve(sensors);
            })
            .catch((error) => {
                me.session = null;

                me.log('ERROR: Could not enumerate motion sensors: ' + error);
                return Promise.reject(error);
            });
    };

    me.detectMotionFlow = function() {
        return me.authenticationFlow()
            .then(() => {
                return me.unifi.detectMotion(me.session, me.sensors);
            })
            .then((motionEnrichedSensors) => {
                return Promise.resolve(motionEnrichedSensors);
            })
            .catch((error) => {
                me.session = null;

                me.log('ERROR: Could not detect motion: ' + error);
                return Promise.reject(error);
            });
    };
};