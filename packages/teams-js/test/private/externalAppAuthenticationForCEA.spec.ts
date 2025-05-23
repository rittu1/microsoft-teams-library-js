import { errorLibraryNotInitialized } from '../../src/internal/constants';
import { GlobalVars } from '../../src/internal/globalVars';
import * as externalAppAuthentication from '../../src/private/externalAppAuthentication';
import * as externalAppAuthenticationForCEA from '../../src/private/externalAppAuthenticationForCEA';
import { AppId } from '../../src/public';
import * as app from '../../src/public/app/app';
import { errorNotSupportedOnPlatform, FrameContexts } from '../../src/public/constants';
import { Utils } from '../utils';

describe('externalAppAuthenticationForCEA', () => {
  let utils = new Utils();

  beforeEach(() => {
    utils = new Utils();
    utils.mockWindow.parent = undefined;
    utils.messages = [];
    GlobalVars.isFramelessWindow = false;
  });

  afterEach(() => {
    app._uninitialize();
    jest.clearAllMocks();
  });

  // These IDs were randomly generated for the purpose of these tests
  const stringified = '01b92759-b43a-4085-ac22-7772d94bb7a9';
  const testAppId = new AppId(stringified);
  const testConversationId = '01b92759-b43a-4085-ac22-777777777777';
  const testAuthId = 'testAuthId';
  const testConnectionName = 'testConnectionName';

  const testOriginalRequest: externalAppAuthentication.IActionExecuteInvokeRequest = {
    requestType: externalAppAuthentication.OriginalRequestType.ActionExecuteInvokeRequest,
    type: 'Action.Execute',
    id: '1',
    verb: 'action',
    data: {},
  };
  const testOriginalRequestWithInvalidType: externalAppAuthentication.IActionExecuteInvokeRequest = {
    requestType: externalAppAuthentication.OriginalRequestType.ActionExecuteInvokeRequest,
    type: 'INVALID_TYPE',
    id: '1',
    verb: 'action',
    data: {},
  };

  describe('authenticateAndResendRequest', () => {
    const testAuthRequest = {
      url: new URL('https://example.com'),
      width: 100,
      height: 100,
      isExternal: true,
    };
    const testResponse = {
      responseType: externalAppAuthentication.InvokeResponseType.ActionExecuteInvokeResponse,
      value: {},
      signature: 'test signature',
      statusCode: 200,
      type: 'test type',
    };
    const testError = {
      errorCode: 'INTERNAL_ERROR',
      message: 'test error message',
    };
    const allowedFrameContexts = [FrameContexts.content];

    it('should not allow calls before initialization', async () => {
      expect.assertions(1);

      try {
        await externalAppAuthenticationForCEA.authenticateAndResendRequest(
          testAppId,
          testConversationId,
          testAuthRequest,
          testOriginalRequest,
        );
      } catch (e) {
        expect(e).toEqual(new Error(errorLibraryNotInitialized));
      }
    });

    it('should throw error when externalAppAuthenticationForCEA is not supported in runtime config.', async () => {
      await utils.initializeWithContext(FrameContexts.content);
      utils.setRuntimeConfig({ apiVersion: 2, supports: {} });
      expect.assertions(1);
      try {
        await externalAppAuthenticationForCEA.authenticateAndResendRequest(
          testAppId,
          testConversationId,
          testAuthRequest,
          testOriginalRequest,
        );
      } catch (e) {
        expect(e).toEqual(errorNotSupportedOnPlatform);
      }
    });

    Object.values(FrameContexts).forEach((frameContext) => {
      if (allowedFrameContexts.includes(frameContext)) {
        it(`should return response on success with context - ${frameContext}`, async () => {
          expect.assertions(3);
          await utils.initializeWithContext(frameContext);
          utils.setRuntimeConfig({ apiVersion: 2, supports: { externalAppAuthenticationForCEA: {} } });
          const promise = externalAppAuthenticationForCEA.authenticateAndResendRequest(
            testAppId,
            testConversationId,
            testAuthRequest,
            testOriginalRequest,
          );
          const message = utils.findMessageByFunc('externalAppAuthenticationForCEA.authenticateAndResendRequest');
          if (message && message.args) {
            expect(message).not.toBeNull();
            expect(message.args).toEqual([
              testAppId.toString(),
              testConversationId,
              testOriginalRequest,
              testAuthRequest.url.href,
              testAuthRequest.width,
              testAuthRequest.height,
              testAuthRequest.isExternal,
            ]);
            // eslint-disable-next-line strict-null-checks/all
            utils.respondToMessage(message, testResponse);
          }
          return expect(promise).resolves.toEqual(testResponse);
        });
        it(`should throw error if the actionExecuteInvokeRequest.data is not of correct type - ${frameContext}`, async () => {
          expect.assertions(1);
          await utils.initializeWithContext(frameContext);
          utils.setRuntimeConfig({ apiVersion: 2, supports: { externalAppAuthenticationForCEA: {} } });
          const invalidDataRequest = {
            ...testOriginalRequest,
            data: { function() {} },
          };
          try {
            await externalAppAuthenticationForCEA.authenticateAndResendRequest(
              testAppId,
              testConversationId,
              testAuthRequest,
              invalidDataRequest,
            );
          } catch (e) {
            expect(e).toEqual({
              errorCode: 'INTERNAL_ERROR',
              message: `Invalid data type ${typeof invalidDataRequest.data}. Data must be a primitive or a plain object.`,
            });
          }
        });
        it(`should throw error if the appId is not an instance of AppId class - ${frameContext}`, async () => {
          expect.assertions(1);
          await utils.initializeWithContext(frameContext);
          utils.setRuntimeConfig({ apiVersion: 2, supports: { externalAppAuthenticationForCEA: {} } });
          try {
            await externalAppAuthenticationForCEA.authenticateAndResendRequest(
              {} as unknown as AppId,
              testConversationId,
              testAuthRequest,
              testOriginalRequest,
            );
          } catch (e) {
            expect(e).toEqual(
              new Error('Potential app id ([object Object]) is invalid; it is not an instance of AppId class.'),
            );
          }
        });
        it(`should throw error on invalid original request with context - ${frameContext}`, async () => {
          expect.assertions(1);
          await utils.initializeWithContext(frameContext);
          utils.setRuntimeConfig({ apiVersion: 2, supports: { externalAppAuthenticationForCEA: {} } });
          try {
            await externalAppAuthenticationForCEA.authenticateAndResendRequest(
              testAppId,
              testConversationId,
              testAuthRequest,
              testOriginalRequestWithInvalidType,
            );
          } catch (e) {
            expect(e).toEqual({
              errorCode: 'INTERNAL_ERROR',
              message: `Invalid action type ${testOriginalRequestWithInvalidType.type}. Action type must be "Action.Execute"`,
            });
          }
        });
        it(`should throw error from host on failure with context - ${frameContext}`, async () => {
          expect.assertions(3);
          await utils.initializeWithContext(frameContext);
          utils.setRuntimeConfig({ apiVersion: 2, supports: { externalAppAuthenticationForCEA: {} } });
          const promise = externalAppAuthenticationForCEA.authenticateAndResendRequest(
            testAppId,
            testConversationId,
            testAuthRequest,
            testOriginalRequest,
          );
          const message = utils.findMessageByFunc('externalAppAuthenticationForCEA.authenticateAndResendRequest');
          if (message && message.args) {
            expect(message).not.toBeNull();
            expect(message.args).toEqual([
              testAppId.toString(),
              testConversationId,
              testOriginalRequest,
              testAuthRequest.url.href,
              testAuthRequest.width,
              testAuthRequest.height,
              testAuthRequest.isExternal,
            ]);
            utils.respondToMessage(message, testError);
          }
          return expect(promise).rejects.toThrowError(`${testError.errorCode}, message: ${testError.message}`);
        });
        it(`should throw default error when host sends a response that does not fit InvokeError or ActionExecuteResponse - ${frameContext}`, async () => {
          expect.assertions(3);
          await utils.initializeWithContext(frameContext);
          utils.setRuntimeConfig({ apiVersion: 2, supports: { externalAppAuthenticationForCEA: {} } });
          const promise = externalAppAuthenticationForCEA.authenticateAndResendRequest(
            testAppId,
            testConversationId,
            testAuthRequest,
            testOriginalRequest,
          );
          const message = utils.findMessageByFunc('externalAppAuthenticationForCEA.authenticateAndResendRequest');
          const testInvalidResponse = {
            responseType: 'INVALID_RESPONSE_TYPE',
          };
          if (message && message.args) {
            expect(message).not.toBeNull();
            expect(message.args).toEqual([
              testAppId.toString(),
              testConversationId,
              testOriginalRequest,
              testAuthRequest.url.href,
              testAuthRequest.width,
              testAuthRequest.height,
              testAuthRequest.isExternal,
            ]);
            utils.respondToMessage(message, testInvalidResponse);
          }

          return expect(promise).rejects.toThrowError(
            new Error(`500, message: Invalid response from host - ${JSON.stringify(testInvalidResponse)}`),
          );
        });
      } else {
        it(`should not allow calls from ${frameContext} context`, async () => {
          await utils.initializeWithContext(frameContext);
          utils.setRuntimeConfig({ apiVersion: 2, supports: { externalAppAuthenticationForCEA: {} } });

          await expect(
            externalAppAuthenticationForCEA.authenticateAndResendRequest(
              testAppId,
              testConversationId,
              testAuthRequest,
              testOriginalRequest,
            ),
          ).rejects.toThrow(
            new Error(
              `This call is only allowed in following contexts: ${JSON.stringify(allowedFrameContexts)}. ` +
                `Current context: "${frameContext}".`,
            ),
          );
        });
      }
    });
  });

  describe('authenticateWithSSO', () => {
    const testAuthId = 'testAuthId';
    const testConnectionName = 'testConnectionName';

    const testRequest = {
      authId: testAuthId,
      connectionName: testConnectionName,
      claims: ['claims'],
      silent: true,
    };
    const allowedFrameContexts = [FrameContexts.content];

    it('should not allow calls before initialization', async () => {
      expect.assertions(1);

      try {
        await externalAppAuthenticationForCEA.authenticateWithSSO(testAppId, testConversationId, {
          authId: testAuthId,
          connectionName: testConnectionName,
        });
      } catch (e) {
        expect(e).toEqual(new Error(errorLibraryNotInitialized));
      }
    });

    it('should throw error when externalAppAuthenticationForCEA is not supported in runtime config.', async () => {
      await utils.initializeWithContext(FrameContexts.content);
      utils.setRuntimeConfig({ apiVersion: 2, supports: {} });
      expect.assertions(1);
      try {
        await externalAppAuthenticationForCEA.authenticateWithSSO(testAppId, testConversationId, {
          authId: testAuthId,
          connectionName: testConnectionName,
        });
      } catch (e) {
        expect(e).toEqual(errorNotSupportedOnPlatform);
      }
    });
    Object.values(FrameContexts).forEach((frameContext) => {
      if (allowedFrameContexts.includes(frameContext)) {
        it(`should throw error if the appId is not an instance of AppId class - ${frameContext}`, async () => {
          expect.assertions(1);
          await utils.initializeWithContext(frameContext);
          utils.setRuntimeConfig({ apiVersion: 2, supports: { externalAppAuthenticationForCEA: {} } });
          try {
            await externalAppAuthenticationForCEA.authenticateWithSSO(
              {} as unknown as AppId,
              testConversationId,
              testRequest,
            );
          } catch (e) {
            expect(e).toEqual(
              new Error('Potential app id ([object Object]) is invalid; it is not an instance of AppId class.'),
            );
          }
        });
        it('should throw error from host', async () => {
          await utils.initializeWithContext(FrameContexts.content);
          utils.setRuntimeConfig({ apiVersion: 2, supports: { externalAppAuthenticationForCEA: {} } });
          const testError = {
            errorCode: 'INTERNAL_ERROR',
            message: 'test error message',
          };

          const promise = externalAppAuthenticationForCEA.authenticateWithSSO(
            testAppId,
            testConversationId,
            testRequest,
          );

          const message = utils.findMessageByFunc('externalAppAuthenticationForCEA.authenticateWithSSO');
          if (message && message.args) {
            expect(message).not.toBeNull();
            expect(message.args).toEqual([
              testAppId.toString(),
              testConversationId,
              testRequest.authId,
              testRequest.connectionName,
              testRequest.claims,
              testRequest.silent,
            ]);
            utils.respondToMessage(message, testError);
          }

          await expect(promise).rejects.toThrowError(`${testError.errorCode}, message: ${testError.message ?? 'None'}`);
        });
        it('should resolve on success', async () => {
          expect.assertions(3);
          await utils.initializeWithContext(FrameContexts.content);
          utils.setRuntimeConfig({ apiVersion: 2, supports: { externalAppAuthenticationForCEA: {} } });
          const promise = externalAppAuthenticationForCEA.authenticateWithSSO(
            testAppId,
            testConversationId,
            testRequest,
          );

          const message = utils.findMessageByFunc('externalAppAuthenticationForCEA.authenticateWithSSO');
          if (message && message.args) {
            expect(message).not.toBeNull();
            expect(message.args).toEqual([
              testAppId.toString(),
              testConversationId,
              testRequest.authId,
              testRequest.connectionName,
              testRequest.claims,
              testRequest.silent,
            ]);
            utils.respondToMessage(message);
          }
          await expect(promise).resolves.toBeUndefined();
        });
      } else {
        it(`should not allow calls from ${frameContext} context`, async () => {
          await utils.initializeWithContext(frameContext);
          utils.setRuntimeConfig({ apiVersion: 2, supports: { externalAppAuthenticationForCEA: {} } });

          await expect(
            externalAppAuthenticationForCEA.authenticateWithSSO(testAppId, testConversationId, testRequest),
          ).rejects.toThrow(
            new Error(
              `This call is only allowed in following contexts: ${JSON.stringify(allowedFrameContexts)}. ` +
                `Current context: "${frameContext}".`,
            ),
          );
        });
      }
    });
  });

  describe('authenticateWithSSOAndResendRequest', () => {
    const testAuthRequest: externalAppAuthenticationForCEA.AuthTokenRequestParametersForCEA = {
      claims: ['claims'],
      silent: true,
      authId: testAuthId,
      connectionName: testConnectionName,
    };
    it('should not allow calls before initialization', async () => {
      expect.assertions(1);

      try {
        await externalAppAuthenticationForCEA.authenticateWithSSOAndResendRequest(
          testAppId,
          testConversationId,
          testAuthRequest,
          testOriginalRequest,
        );
      } catch (e) {
        expect(e).toEqual(new Error(errorLibraryNotInitialized));
      }
    });

    it('should throw error when externalAppAuthenticationForCEA is not supported in runtime config.', async () => {
      expect.assertions(1);
      await utils.initializeWithContext(FrameContexts.content);
      utils.setRuntimeConfig({ apiVersion: 2, supports: {} });
      try {
        await externalAppAuthenticationForCEA.authenticateWithSSOAndResendRequest(
          testAppId,
          testConversationId,
          testAuthRequest,
          testOriginalRequest,
        );
      } catch (e) {
        expect(e).toEqual(errorNotSupportedOnPlatform);
      }
    });
    const allowedFrameContexts = [FrameContexts.content];
    Object.values(FrameContexts).forEach((frameContext) => {
      if (allowedFrameContexts.includes(frameContext)) {
        it(`should throw error if the appId is not an instance of AppId class - ${frameContext}`, async () => {
          expect.assertions(1);
          await utils.initializeWithContext(frameContext);
          utils.setRuntimeConfig({ apiVersion: 2, supports: { externalAppAuthenticationForCEA: {} } });
          try {
            await externalAppAuthenticationForCEA.authenticateWithSSOAndResendRequest(
              {} as unknown as AppId,
              testConversationId,
              testAuthRequest,
              testOriginalRequest,
            );
          } catch (e) {
            expect(e).toEqual(
              new Error('Potential app id ([object Object]) is invalid; it is not an instance of AppId class.'),
            );
          }
        });

        it(`should throw error from host failure in context - ${frameContext}`, async () => {
          expect.assertions(3);
          const testError = {
            errorCode: 'INTERNAL_ERROR',
            message: 'test error message',
          };
          await utils.initializeWithContext(FrameContexts.content);
          utils.setRuntimeConfig({ apiVersion: 2, supports: { externalAppAuthenticationForCEA: {} } });
          const promise = externalAppAuthenticationForCEA.authenticateWithSSOAndResendRequest(
            testAppId,
            testConversationId,
            testAuthRequest,
            testOriginalRequest,
          );

          const message = utils.findMessageByFunc(
            'externalAppAuthenticationForCEA.authenticateWithSSOAndResendRequest',
          );
          if (message && message.args) {
            expect(message).not.toBeNull();
            expect(message.args).toEqual([
              testAppId.toString(),
              testConversationId,
              testOriginalRequest,
              testAuthId,
              testConnectionName,
              testAuthRequest.claims,
              testAuthRequest.silent,
            ]);
            // eslint-disable-next-line strict-null-checks/all
            utils.respondToMessage(message, testError);
          }
          await expect(promise).rejects.toThrow(
            new Error(`${testError.errorCode}, message: ${testError.message ?? 'None'}`),
          );
        });

        it(`should throw error from host failure in context - ${frameContext}`, async () => {
          expect.assertions(3);
          await utils.initializeWithContext(FrameContexts.content);
          utils.setRuntimeConfig({ apiVersion: 2, supports: { externalAppAuthenticationForCEA: {} } });
          const promise = externalAppAuthenticationForCEA.authenticateWithSSOAndResendRequest(
            testAppId,
            testConversationId,
            testAuthRequest,
            testOriginalRequest,
          );

          const message = utils.findMessageByFunc(
            'externalAppAuthenticationForCEA.authenticateWithSSOAndResendRequest',
          );
          const invalidTestError = {
            invalidError: 'invalidError',
          };

          if (message && message.args) {
            expect(message).not.toBeNull();
            expect(message.args).toEqual([
              testAppId.toString(),
              testConversationId,
              testOriginalRequest,
              testAuthId,
              testConnectionName,
              testAuthRequest.claims,
              testAuthRequest.silent,
            ]);

            // eslint-disable-next-line strict-null-checks/all
            utils.respondToMessage(message, invalidTestError);
          }
          await expect(promise).rejects.toThrowError(
            new Error(`500, message: Invalid response from host - ${JSON.stringify(invalidTestError)}`),
          );
        });

        it(`should throw error if the IActionExecuteInvokeRequest.data is not of correct type - ${frameContext}`, async () => {
          expect.assertions(1);
          await utils.initializeWithContext(frameContext);
          utils.setRuntimeConfig({ apiVersion: 2, supports: { externalAppAuthenticationForCEA: {} } });
          const invalidDataRequest = {
            ...testOriginalRequest,
            data: { function() {} },
          };
          try {
            await externalAppAuthenticationForCEA.authenticateWithSSOAndResendRequest(
              testAppId,
              testConversationId,
              testAuthRequest,
              invalidDataRequest,
            );
          } catch (e) {
            expect(e).toEqual({
              errorCode: 'INTERNAL_ERROR',
              message: `Invalid data type ${typeof invalidDataRequest.data}. Data must be a primitive or a plain object.`,
            });
          }
        });
        it(`should throw error on invalid original request with context - ${frameContext}`, async () => {
          expect.assertions(1);
          await utils.initializeWithContext(frameContext);
          utils.setRuntimeConfig({ apiVersion: 2, supports: { externalAppAuthenticationForCEA: {} } });
          try {
            await externalAppAuthenticationForCEA.authenticateWithSSOAndResendRequest(
              testAppId,
              testConversationId,
              testAuthRequest,
              testOriginalRequestWithInvalidType,
            );
          } catch (e) {
            expect(e).toEqual({
              errorCode: 'INTERNAL_ERROR',
              message: `Invalid action type ${testOriginalRequestWithInvalidType.type}. Action type must be "Action.Execute"`,
            });
          }
        });
        it(`should return response on success in context - ${frameContext}`, async () => {
          expect.assertions(3);
          const testResponse = {
            responseType: externalAppAuthentication.InvokeResponseType.ActionExecuteInvokeResponse,
            value: {},
            signature: 'test signature',
            statusCode: 200,
            type: 'test type',
          };
          await utils.initializeWithContext(frameContext);
          utils.setRuntimeConfig({ apiVersion: 2, supports: { externalAppAuthenticationForCEA: {} } });
          const promise = externalAppAuthenticationForCEA.authenticateWithSSOAndResendRequest(
            testAppId,
            testConversationId,
            testAuthRequest,
            testOriginalRequest,
          );

          const message = utils.findMessageByFunc(
            'externalAppAuthenticationForCEA.authenticateWithSSOAndResendRequest',
          );
          if (message && message.args) {
            expect(message).not.toBeNull();
            expect(message.args).toEqual([
              testAppId.toString(),
              testConversationId,
              testOriginalRequest,
              testAuthId,
              testConnectionName,
              testAuthRequest.claims,
              testAuthRequest.silent,
            ]);
            // eslint-disable-next-line strict-null-checks/all
            utils.respondToMessage(message, testResponse);
          }
          await expect(promise).resolves.toEqual(testResponse);
        });
      } else {
        it(`should not allow calls from ${frameContext} context`, async () => {
          await utils.initializeWithContext(frameContext);
          utils.setRuntimeConfig({ apiVersion: 2, supports: { externalAppAuthenticationForCEA: {} } });
          await expect(() =>
            externalAppAuthenticationForCEA.authenticateWithSSOAndResendRequest(
              testAppId,
              testConversationId,
              testAuthRequest,
              testOriginalRequest,
            ),
          ).rejects.toThrow(
            new Error(
              `This call is only allowed in following contexts: ${JSON.stringify(allowedFrameContexts)}. ` +
                `Current context: "${frameContext}".`,
            ),
          );
        });
      }
    });
  });

  describe('authenticateWithOauth', () => {
    const testAuthRequest = {
      url: new URL('https://example.com'),
      width: 100,
      height: 100,
      isExternal: true,
    };
    const allowedFrameContexts = [FrameContexts.content];
    it('should not allow calls before initialization', async () => {
      expect.assertions(1);

      try {
        await externalAppAuthenticationForCEA.authenticateWithOauth(testAppId, testConversationId, testAuthRequest);
      } catch (e) {
        expect(e).toEqual(new Error(errorLibraryNotInitialized));
      }
    });

    it('should throw error when externalAppAuthenticationForCEA is not supported in runtime config.', async () => {
      await utils.initializeWithContext(FrameContexts.content);
      utils.setRuntimeConfig({ apiVersion: 2, supports: {} });
      expect.assertions(1);
      try {
        await externalAppAuthenticationForCEA.authenticateWithOauth(testAppId, testConversationId, testAuthRequest);
      } catch (e) {
        expect(e).toEqual(errorNotSupportedOnPlatform);
      }
    });

    Object.values(FrameContexts).forEach((frameContext) => {
      if (allowedFrameContexts.includes(frameContext)) {
        it(`should throw error if the appId is not an instance of AppId class - ${frameContext}`, async () => {
          expect.assertions(1);
          await utils.initializeWithContext(frameContext);
          utils.setRuntimeConfig({ apiVersion: 2, supports: { externalAppAuthenticationForCEA: {} } });
          try {
            await externalAppAuthenticationForCEA.authenticateWithOauth(
              {} as unknown as AppId,
              testConversationId,
              testAuthRequest,
            );
          } catch (e) {
            expect(e).toEqual(
              new Error('Potential app id ([object Object]) is invalid; it is not an instance of AppId class.'),
            );
          }
        });
        it(`should resolve on success with context - ${frameContext}`, async () => {
          expect.assertions(3);
          await utils.initializeWithContext(frameContext);
          utils.setRuntimeConfig({ apiVersion: 2, supports: { externalAppAuthenticationForCEA: {} } });
          const promise = externalAppAuthenticationForCEA.authenticateWithOauth(
            testAppId,
            testConversationId,
            testAuthRequest,
          );
          const message = utils.findMessageByFunc('externalAppAuthenticationForCEA.authenticateWithOauth');
          if (message && message.args) {
            expect(message).not.toBeNull();
            expect(message.args).toEqual([
              testAppId.toString(),
              testConversationId,
              testAuthRequest.url.href,
              testAuthRequest.width,
              testAuthRequest.height,
              testAuthRequest.isExternal,
            ]);
            utils.respondToMessage(message);
          }
          await expect(promise).resolves.toBeUndefined();
        });
        it('should throw error from host', async () => {
          await utils.initializeWithContext(FrameContexts.content);
          utils.setRuntimeConfig({ apiVersion: 2, supports: { externalAppAuthenticationForCEA: {} } });
          const testError = {
            errorCode: 'INTERNAL_ERROR',
            message: 'test error message',
          };
          const promise = externalAppAuthenticationForCEA.authenticateWithOauth(
            testAppId,
            testConversationId,
            testAuthRequest,
          );
          const message = utils.findMessageByFunc('externalAppAuthenticationForCEA.authenticateWithOauth');
          if (message && message.args) {
            expect(message).not.toBeNull();
            expect(message.args).toEqual([
              testAppId.toString(),
              testConversationId,
              testAuthRequest.url.href,
              testAuthRequest.width,
              testAuthRequest.height,
              testAuthRequest.isExternal,
            ]);
            utils.respondToMessage(message, testError);
          }
          await expect(promise).rejects.toThrowError(
            new Error(`${testError.errorCode}, message: ${testError.message ?? 'None'}`),
          );
        });
      } else {
        it(`should not allow calls from ${frameContext} context`, async () => {
          await utils.initializeWithContext(frameContext);
          utils.setRuntimeConfig({ apiVersion: 2, supports: { externalAppAuthenticationForCEA: {} } });
          await expect(
            externalAppAuthenticationForCEA.authenticateWithOauth(testAppId, testConversationId, testAuthRequest),
          ).rejects.toThrow(
            new Error(
              `This call is only allowed in following contexts: ${JSON.stringify(allowedFrameContexts)}. ` +
                `Current context: "${frameContext}".`,
            ),
          );
        });
      }
    });
  });
  describe('isSupported', () => {
    it('should not allow calls before initialization', async () => {
      expect.assertions(1);

      try {
        externalAppAuthenticationForCEA.isSupported();
      } catch (e) {
        expect(e).toEqual(new Error(errorLibraryNotInitialized));
      }
    });

    it('should return true when externalAppCardActions capability is supported', async () => {
      expect.assertions(1);
      await utils.initializeWithContext(FrameContexts.content);
      utils.setRuntimeConfig({ apiVersion: 2, supports: { externalAppAuthenticationForCEA: {} } });
      return expect(externalAppAuthenticationForCEA.isSupported()).toEqual(true);
    });
    it('should return false when externalAppCardActions capability is not supported', async () => {
      expect.assertions(1);
      await utils.initializeWithContext(FrameContexts.content);
      utils.setRuntimeConfig({ apiVersion: 2, supports: {} });
      return expect(externalAppAuthenticationForCEA.isSupported()).toEqual(false);
    });
  });
});
