const request = require('request-promise-native');

////////////////////////////////////////////
/// Mock request calls to HomeWizard API ///
////////////////////////////////////////////
module.exports.RequestMocking = function () {
    const me = this;

    me.mockAuthenticationGetRequest = function (succeedAfterAttempt = -1, responseContainsError = false) {
        const mock = jest.spyOn(request, 'post');

        let count = 0;
        mock.mockImplementation((opts) => {
            console.log('Mock called');

            if (succeedAfterAttempt === -1) {
                return Promise.reject('dummy-fail');
            } else {
                if (count++ < succeedAfterAttempt) {
                    return Promise.reject('dummy-fail');
                } else {
                    if (responseContainsError) {
                        return Promise.resolve({error: 'dummy-fail'});
                    }
                    return Promise.resolve({headers: {authorization: 'dummy-auth'}});
                }
            }
        });
        return mock;
    };

    me.mockCamerasGetRequest = function (succeedAfterAttempt = -1, responseContainsError = false) {
        const mock = jest.spyOn(request, 'get');

        let count = 0;
        mock.mockImplementation((opts) => {
            console.log('Mock called');

            if (succeedAfterAttempt === -1) {
                return Promise.reject('dummy-fail');
            } else {
                if (count++ < succeedAfterAttempt) {
                    return Promise.reject('dummy-fail');
                } else {
                    if (responseContainsError) {
                        return Promise.resolve({error: 'dummy-fail'});
                    }
                    return Promise.resolve(me.getCamerasReplyData());
                }
            }

        });
        return mock;
    };
    me.getCamerasReplyData = function () {
        const reply = {
            body: {
                cameras: []
            }
        };
        for (let i = 0; i < 2; i++) {
            const camera = {
                id: 'dummy-id',
                name: 'dummy-name',
                host: 'dummy-host',
                mac: 'dummy-mac'
            };
            reply.body.cameras.push(camera);
        }
        return reply;
    };

    me.mockGetMotionEventsRequest = function (succeedAfterAttempt = -1, responseContainsError = false) {
        const mock = jest.spyOn(request, 'get');

        let count = 0;
        mock.mockImplementation((opts) => {
            console.log('Mock called');

            if (succeedAfterAttempt === -1) {
                return Promise.reject('dummy-fail');
            } else {
                if (count++ < succeedAfterAttempt) {
                    return Promise.reject('dummy-fail');
                } else {
                    if (responseContainsError) {
                        return Promise.resolve({body: {error: 'Failed'}});
                    }
                    return Promise.resolve({body: [{camera: 'cam-1', score: 10}, {camera: 'cam-2', score: 30}, {camera: 'cam-1', score: 50}, {camera: 'cam-2', score: 70}]});
                }
            }
        });
        return mock;
    };
};