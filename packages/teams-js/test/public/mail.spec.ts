import { errorLibraryNotInitialized } from '../../src/internal/constants';
import { GlobalVars } from '../../src/internal/globalVars';
import { FrameContexts, mail } from '../../src/public';
import * as app from '../../src/public/app/app';
import { _minRuntimeConfigToUninitialize } from '../../src/public/runtime';
import { Utils } from '../utils';

/* eslint-disable */
/* As part of enabling eslint on test files, we need to disable eslint checking on the specific files with
   large numbers of errors. Then, over time, we can fix the errors and reenable eslint on a per file basis. */

const dataError = 'Something went wrong...';

describe('mail', () => {
  // Use to send a mock message from the app.
  const utils = new Utils();

  beforeEach(() => {
    utils.processMessage = null;
    utils.messages = [];
    utils.childMessages = [];
    utils.childWindow.closed = false;
    GlobalVars.frameContext = undefined;

    // Set a mock window for testing
    app._initialize(utils.mockWindow);
  });

  afterEach(() => {
    // Reset the object since it's a singleton
    if (app._uninitialize) {
      utils.setRuntimeConfig(_minRuntimeConfigToUninitialize);
      app._uninitialize();
    }
  });

  describe('openMailItem', () => {
    const openMailItemParams: mail.OpenMailItemParams = {
      itemId: '1',
    };

    it('should not allow calls before initialization', async () => {
      expect.assertions(1);
      await mail
        .openMailItem(openMailItemParams)
        .catch((e) => expect(e).toMatchObject(new Error(errorLibraryNotInitialized)));
    });

    Object.keys(FrameContexts)
      .map((k) => FrameContexts[k])
      .forEach((frameContext) => {
        it(`should not allow calls from ${frameContext} context`, async () => {
          if (frameContext === FrameContexts.content) {
            return;
          }

          expect.assertions(1);
          await utils.initializeWithContext(frameContext);

          await mail
            .openMailItem(openMailItemParams)
            .catch((e) =>
              expect(e).toMatchObject(
                new Error(
                  `This call is only allowed in following contexts: ["content"]. Current context: "${frameContext}".`,
                ),
              ),
            );
        });
      });

    it('should not allow calls if runtime does not support mail', async () => {
      expect.assertions(1);
      await utils.initializeWithContext('content');
      utils.setRuntimeConfig({ apiVersion: 1, supports: {} });

      await expect(mail.openMailItem(openMailItemParams)).rejects.toThrowError('Not supported');
    });

    it('should throw if a null itemId is supplied', async () => {
      expect.assertions(1);
      await utils.initializeWithContext('content');
      utils.setRuntimeConfig({ apiVersion: 1, supports: { mail: {} } });

      await mail
        .openMailItem({ itemId: null })
        .catch((e) => expect(e).toMatchObject(new Error('Must supply an itemId to openMailItem')));
    });

    it('should throw if an undefined itemId is supplied', async () => {
      expect.assertions(1);
      await utils.initializeWithContext('content');
      utils.setRuntimeConfig({ apiVersion: 1, supports: { mail: {} } });

      await mail
        .openMailItem({ itemId: undefined })
        .catch((e) => expect(e).toMatchObject(new Error('Must supply an itemId to openMailItem')));
    });

    it('should throw if an empty itemId is supplied', async () => {
      expect.assertions(1);
      await utils.initializeWithContext('content');
      utils.setRuntimeConfig({ apiVersion: 1, supports: { mail: {} } });

      await mail
        .openMailItem({ itemId: '' })
        .catch((e) => expect(e).toMatchObject(new Error('Must supply an itemId to openMailItem')));
    });

    it('should successfully throw if the openMailItem message sends and fails', async () => {
      expect.assertions(1);
      await utils.initializeWithContext('content');
      utils.setRuntimeConfig({ apiVersion: 1, supports: { mail: {} } });

      const openMailItemPromise = mail.openMailItem(openMailItemParams);

      const openMailItemMessage = utils.findMessageByFunc('mail.openMailItem');

      const data = {
        success: false,
        error: dataError,
      };

      await utils.respondToMessage(openMailItemMessage, data.success, data.error);
      await openMailItemPromise.catch((e) => expect(e).toMatchObject(new Error(dataError)));
    });

    it('should successfully send the openMailItem message', async () => {
      await utils.initializeWithContext('content');
      utils.setRuntimeConfig({ apiVersion: 1, supports: { mail: {} } });

      const promise = mail.openMailItem(openMailItemParams);

      const openMailItemMessage = utils.findMessageByFunc('mail.openMailItem');

      const data = {
        success: true,
      };

      await utils.respondToMessage(openMailItemMessage, data.success);
      await promise;

      expect(openMailItemMessage).not.toBeNull();
      expect(openMailItemMessage.args.length).toEqual(1);
      expect(openMailItemMessage.args[0]).toStrictEqual(openMailItemParams);
    });

    it('should resolve promise after sending successful openMailItem message', async () => {
      await utils.initializeWithContext('content');
      utils.setRuntimeConfig({ apiVersion: 1, supports: { mail: {} } });

      const promise = mail.openMailItem(openMailItemParams);

      const openMailItemMessage = utils.findMessageByFunc('mail.openMailItem');

      const data = {
        success: true,
      };

      await utils.respondToMessage(openMailItemMessage, data.success);

      await expect(promise).resolves.not.toThrow();
    });
  });

  describe('composeMail', () => {
    const composeMailParams: mail.ComposeMailParams = {
      type: mail.ComposeMailType.New,
    };

    it('should not allow calls before initialization', async () => {
      expect.assertions(1);
      await mail
        .composeMail(composeMailParams)
        .catch((e) => expect(e).toMatchObject(new Error(errorLibraryNotInitialized)));
    });

    Object.keys(FrameContexts)
      .map((k) => FrameContexts[k])
      .forEach((frameContext) => {
        it(`should not allow calls from ${frameContext} context`, async () => {
          if (frameContext === FrameContexts.content) {
            return;
          }

          expect.assertions(1);

          await utils.initializeWithContext(frameContext);

          await mail
            .composeMail(composeMailParams)
            .catch((e) =>
              expect(e).toMatchObject(
                new Error(
                  `This call is only allowed in following contexts: ["content"]. Current context: "${frameContext}".`,
                ),
              ),
            );
        });
      });

    it('should not allow calls if runtime does not support mail', async () => {
      expect.assertions(1);

      await utils.initializeWithContext('content');
      utils.setRuntimeConfig({ apiVersion: 1, supports: {} });

      await expect(mail.composeMail(composeMailParams)).rejects.toThrowError('Not supported');
    });

    it('should successfully throw if the composeMail message sends and fails', async () => {
      expect.assertions(1);

      await utils.initializeWithContext('content');
      utils.setRuntimeConfig({ apiVersion: 1, supports: { mail: {} } });

      const composeMailPromise = mail.composeMail(composeMailParams);

      const composeMail = utils.findMessageByFunc('mail.composeMail');

      const data = {
        success: false,
        error: dataError,
      };

      await utils.respondToMessage(composeMail, data.success, data.error);
      await composeMailPromise.catch((e) => expect(e).toMatchObject(new Error(dataError)));
    });

    it('should successfully send the composeMail message', async () => {
      await utils.initializeWithContext('content');
      utils.setRuntimeConfig({ apiVersion: 1, supports: { mail: {} } });

      const promise = mail.composeMail(composeMailParams);

      const composeMailMessage = utils.findMessageByFunc('mail.composeMail');

      const data = {
        success: true,
      };

      await utils.respondToMessage(composeMailMessage, data.success);
      await promise;

      expect(composeMailMessage).not.toBeNull();
      expect(composeMailMessage.args.length).toEqual(1);
      expect(composeMailMessage.args[0]).toStrictEqual(composeMailParams);
    });

    it('should resolve promise after successfully sending the composeMail message', async () => {
      await utils.initializeWithContext('content');
      utils.setRuntimeConfig({ apiVersion: 1, supports: { mail: {} } });

      const promise = mail.composeMail(composeMailParams);

      const composeMailMessage = utils.findMessageByFunc('mail.composeMail');

      const data = {
        success: true,
      };

      await utils.respondToMessage(composeMailMessage, data.success);
      await expect(promise).resolves.not.toThrow();
    });
  });

  describe('sub-capability mail.handoff.composeMail', () => {
    const composeMailParams: mail.ComposeMailParams = {
      type: mail.ComposeMailType.New,
    };
    const composeMailParamsWithHandoff: mail.handoff.ComposeMailParamsWithHandoff = {
      composeMailParams: composeMailParams,
      handoffId: 'mockHandoffId',
    };
    const composeMailParamsWithInvalidEmails: mail.ComposeMailParams = {
      type: mail.ComposeMailType.New,
      toRecipients: ['sam@example', 'sam1example.com'],
    };
    const paramHandoffWithInvalidEmails: mail.handoff.ComposeMailParamsWithHandoff = {
      composeMailParams: composeMailParamsWithInvalidEmails,
      handoffId: 'mockHandoffId',
    };
    const paramHandoffWithInvalidHandoffId: mail.handoff.ComposeMailParamsWithHandoff = {
      composeMailParams: composeMailParams,
      handoffId: '  ',
    };

    it('should not allow calls before initialization', () => {
      return expect(() => mail.handoff.composeMailWithHandoff(composeMailParamsWithHandoff)).toThrowError(
        new Error(errorLibraryNotInitialized),
      );
    });

    Object.keys(FrameContexts)
      .map((k) => FrameContexts[k])
      .forEach((frameContext) => {
        it(`should not allow calls from ${frameContext} context`, async () => {
          if (frameContext === FrameContexts.content) {
            return;
          }
          await utils.initializeWithContext(frameContext);
          expect.assertions(1);
          expect(() => mail.handoff.composeMailWithHandoff(composeMailParamsWithHandoff)).toThrowError(
            `This call is only allowed in following contexts: ["content"]. Current context: "${frameContext}".`,
          );
        });
      });

    it('should not allow calls if runtime does not support mail', async () => {
      await utils.initializeWithContext('content');
      utils.setRuntimeConfig({ apiVersion: 1, supports: {} });
      expect.assertions(1);
      const error = new Error('Not supported');
      try {
        mail.handoff.composeMailWithHandoff(composeMailParamsWithHandoff);
      } catch (e) {
        expect(e).toEqual(error);
      }
    });

    it('should not allow calls if runtime does not support mail.handoff.composeMail but support mail', async () => {
      await utils.initializeWithContext('content');
      utils.setRuntimeConfig({ apiVersion: 1, supports: { mail: {} } });
      expect.assertions(1);
      const error = new Error('Not supported');
      try {
        mail.handoff.composeMailWithHandoff(composeMailParamsWithHandoff);
      } catch (e) {
        expect(e).toEqual(error);
      }
    });

    it('should not allow calls if handoffId is empty string', async () => {
      await utils.initializeWithContext('content');
      utils.setRuntimeConfig({ apiVersion: 1, supports: { mail: { handoff: {} } } });
      expect.assertions(1);
      const error = new Error('handoffId should not be null or empty string.');
      try {
        mail.handoff.composeMailWithHandoff(paramHandoffWithInvalidHandoffId);
      } catch (e) {
        expect(e).toEqual(error);
      }
    });
    it('should not allow calls if invalid email(s) in the put', async () => {
      await utils.initializeWithContext('content');
      utils.setRuntimeConfig({ apiVersion: 1, supports: { mail: { handoff: {} } } });
      expect.assertions(1);
      const error = new Error('Input email address does not have the correct format.');
      try {
        mail.handoff.composeMailWithHandoff(paramHandoffWithInvalidEmails);
      } catch (e) {
        expect(e).toEqual(error);
      }
    });

    it('should successfully throw if the composeMailParamsWithHandoff message sends and fails', async () => {
      await utils.initializeWithContext('content');
      utils.setRuntimeConfig({ apiVersion: 1, supports: { mail: { handoff: {} } } });
      mail.handoff.composeMailWithHandoff(composeMailParamsWithHandoff).catch((e) => {
        expect(e).toMatchObject(new Error(dataError));
      });
    });

    it('should successfully send the composeMailParamsWithHandoff message', async () => {
      await utils.initializeWithContext('content');
      utils.setRuntimeConfig({ apiVersion: 1, supports: { mail: { handoff: {} } } });
      mail.handoff.composeMailWithHandoff(composeMailParamsWithHandoff).then(() => {
        const message = utils.findMessageByFunc('mail.composeMailWithHandoff');
        expect(message).not.toBeNull();
        expect(message?.args?.length).toEqual(1);
        expect(message?.args?.[0]).toStrictEqual(composeMailParamsWithHandoff);
      });
    });
  });

  describe('isSupported', () => {
    it('should return false if the runtime says mail is not supported', async () => {
      await utils.initializeWithContext(FrameContexts.content);
      utils.setRuntimeConfig({ apiVersion: 1, supports: {} });
      expect(mail.isSupported()).not.toBeTruthy();
    });

    it('should return true if the runtime says mail is supported', async () => {
      await utils.initializeWithContext(FrameContexts.content);
      utils.setRuntimeConfig({ apiVersion: 1, supports: { mail: {} } });
      expect(mail.isSupported()).toBeTruthy();
    });

    it('should throw if called before initialization', () => {
      utils.uninitializeRuntimeConfig();
      expect(() => mail.isSupported()).toThrowError(new Error(errorLibraryNotInitialized));
    });
  });
});
