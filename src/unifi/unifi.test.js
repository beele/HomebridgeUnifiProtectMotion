const Unifi = require("./unifi").Unifi;
const RequestMocking = require("./mocking/request-mocking").RequestMocking;

const Mocks = new RequestMocking();

beforeEach(() => {
    console.log('resetting modules!');
    jest.resetModules();
    jest.resetAllMocks();
    jest.setTimeout(10000);
});

test('Unifi-isSessionStillValid-session-valid', done => {
    const unifi = new Unifi('https://dummy-host', 50, 10000, 1000, 3, (message) => console.log(message));

    const session = {
        authorization: 'dummy-auth',
        timestamp: Date.now()
    };

    unifi.isSessionStillValid(session)
        .then((session) => {
            expect(session).not.toBeUndefined();
            expect(session).not.toBeNull();

            done();
        })
        .catch((error) => {
            fail('When the session is valid it should be returned!');
        });
});
test('Unifi-isSessionStillValid-session-invalid', done => {
    const unifi = new Unifi('https://dummy-host', 50, 10000, 1000, 3, (message) => console.log(message));

    const session = {
        authorization: 'dummy-auth',
        timestamp: (Date.now() - (12 * 3600 * 1000) - 1)
    };

    unifi.isSessionStillValid(session)
        .then((session) => {
            fail('When the session is invalid it should not be returned!');
        })
        .catch((error) => {
            expect(error).not.toBeUndefined();
            expect(error).not.toBeNull();

            done();
        });
});
test('Unifi-isSessionStillValid-session-null', done => {
    const unifi = new Unifi('https://dummy-host', 50, 10000, 1000, 3, (message) => console.log(message));

    unifi.isSessionStillValid(null)
        .then((session) => {
            fail('When the session is invalid it should not be returned!');
        })
        .catch((error) => {
            expect(error).not.toBeUndefined();
            expect(error).not.toBeNull();

            done();
        });
});


test('Unifi-authentication-username-and-password-valid', done => {
    const requestMock = Mocks.mockAuthenticationGetRequest(0, false);

    const unifi = new Unifi('https://dummy-host', 50, 10000, 1000, 3, (message) => console.log(message));
    unifi.authenticate('valid@example.com', 'validPassword')
        .then((session) => {
            console.log(session);

            expect(session).not.toBeNull();
            expect(session.token).not.toBeNull();
            expect(session.timestamp).not.toBeNull();
            expect(requestMock).toBeCalledTimes(1);

            done();
        })
        .catch((error) => {
            fail('Authentication should succeed!');
        });
});
test('Unifi-authentication-unreachable-first-time', done => {
    const requestMock = Mocks.mockAuthenticationGetRequest(1);

    const unifi = new Unifi('https://dummy-host', 50, 10000, 1000, 3, (message) => console.log(message));
    unifi.authenticate('dummy-username', 'dummy-password')
        .then((session) => {
            console.log(session);

            expect(session).not.toBeNull();
            expect(session.token).not.toBeNull();
            expect(session.timestamp).not.toBeNull();
            expect(requestMock).toBeCalledTimes(2);

            done();
        })
        .catch((error) => {
            fail('Authentication should succeed!');
        });
});
test('Unifi-authentication-username-and-password-null', done => {
    const unifi = new Unifi('https://dummy-host', 50, 10000, 1000, 3, (message) => console.log(message));
    unifi.authenticate(null, null)
        .then((session) => {
            fail('Authentication should not succeed when the username and password are null');
        })
        .catch((error) => {
            expect(error).not.toBeNull();
            done();
        });
});
test('Unifi-authentication-unreachable', done => {
    const requestMock = Mocks.mockAuthenticationGetRequest();

    const unifi = new Unifi('https://dummy-host', 50, 10000, 1000, 3, (message) => console.log(message));
    unifi.authenticate('dummy-username', 'dummy-password')
        .then((session) => {
            fail('Authentication should not succeed when the service is unreachable');
        })
        .catch((error) => {
            expect(error).not.toBeNull();
            expect(requestMock).toBeCalledTimes(3);

            done();
        });
});
test('Unifi-authentication-non-valid-credentials', done => {
    const requestMock = Mocks.mockAuthenticationGetRequest(0, true);

    const unifi = new Unifi('https://dummy-host', 50, 10000, 1000, 3, (message) => console.log(message));
    unifi.authenticate('dummy-username', 'dummy-password')
        .then((session) => {
            fail('Authentication should not succeed when the username and password are bogus data');
        })
        .catch((error) => {
            expect(error).not.toBeNull();
            expect(requestMock).toBeCalledTimes(1);

            done();
        });
});


test('Unifi-enumerateMotionSensorsForCameras-with-2-cameras', done => {
    const requestMock = Mocks.mockCamerasGetRequest(0);
    const session = {
        token: 'dummy-token',
        timestamp: Date.now()
    };

    const unifi = new Unifi('https://dummy-host', 50, 10000, 1000, 3, (message) => console.log(message));
    unifi.enumerateMotionSensorsForCameras(session)
        .then((sensors) => {
            expect(sensors).not.toBeNull();
            expect(sensors.length).toEqual(2);
            expect(requestMock).toBeCalledTimes(1);

            done();
        })
        .catch((error) => {
            fail('Sensors should be returned!');
        });
});
test('Unifi-enumerateMotionSensorsForCameras-with-2-cameras-unreachable-first-time', done => {
    const requestMock = Mocks.mockCamerasGetRequest(1);
    const session = {
        token: 'dummy-token',
        timestamp: Date.now()
    };

    const unifi = new Unifi('https://dummy-host', 50, 10000, 1000, 3, (message) => console.log(message));
    unifi.enumerateMotionSensorsForCameras(session)
        .then((sensors) => {
            expect(sensors).not.toBeNull();
            expect(sensors.length).toEqual(2);
            expect(requestMock).toBeCalledTimes(2);

            done();
        })
        .catch((error) => {
            fail('Sensors should be returned!');
        });
});
test('Unifi-enumerateMotionSensorsForCameras-unreachable', done => {
    const requestMock = Mocks.mockCamerasGetRequest();
    const session = {
        token: 'dummy-token',
        timestamp: Date.now()
    };

    const unifi = new Unifi('https://dummy-host', 50, 10000, 1000, 3, (message) => console.log(message));
    unifi.enumerateMotionSensorsForCameras(session)
        .then((sensors) => {
            fail('enumerateMotionSensorsForCameras should not return data when the service is unreachable');
        })
        .catch((error) => {
            expect(error).not.toBeNull();
            expect(requestMock).toBeCalledTimes(3);

            done();
        });
});


test('Unifi-detectMotion-successful', done => {
    const requestMock = Mocks.mockGetMotionEventsRequest(0, false);
    const session = {
        token: 'dummy-token',
        timestamp: Date.now()
    };

    const unifi = new Unifi('https://dummy-host', 50, 10000, 1000, 3, (message) => console.log(message));
    unifi.detectMotion(session, [{context: {id: 'cam-1'}}, {context: {id: 'cam-2'}}])
        .then((sensors) => {
            expect(sensors).not.toBeNull();
            expect(sensors.length).toEqual(2);
            expect(requestMock).toBeCalledTimes(1);

            done();
        })
        .catch((error) => {
            fail('setSwitchState should return a success message');
        });
});
test('Unifi-detectMotion-successful-unreachable-first-time', done => {
    const requestMock = Mocks.mockGetMotionEventsRequest(1);
    const session = {
        token: 'dummy-token',
        timestamp: Date.now()
    };

    const unifi = new Unifi('https://dummy-host', 50, 10000, 1000, 3, (message) => console.log(message));
    unifi.detectMotion(session, [{context: {id: 'cam-1'}}, {context: {id: 'cam-2'}}])
        .then((sensors) => {
            expect(sensors).not.toBeNull();
            expect(sensors.length).toEqual(2);
            expect(requestMock).toBeCalledTimes(2);

            done();
        })
        .catch((error) => {
            fail('setSwitchState should return a success message');
        });
});
test('Unifi-detectMotion-unreachable', done => {
    const requestMock = Mocks.mockGetMotionEventsRequest();
    const session = {
        token: 'dummy-token',
        timestamp: Date.now()
    };

    const unifi = new Unifi('https://dummy-host', 50, 10000, 1000, 3, (message) => console.log(message));
    unifi.detectMotion(session, [{context: {id: 'cam-1'}}, {context: {id: 'cam-2'}}])
        .then((sensors) => {
            fail('setSwitchState should not return data when the service is unreachable');
        })
        .catch((error) => {
            expect(error).not.toBeNull();
            expect(requestMock).toBeCalledTimes(3);

            done();
        });
});
