'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var secretManager = require('@google-cloud/secret-manager');

/* eslint-disable functional/functional-parameters */
const makeSecrets = (input) => {
    const secretInput = {
        parent: input.parent,
        secretId: input.secretId,
        client: input.client,
    };
    return {
        create: createSecret(secretInput),
        get: async () => getSecret(secretInput),
        delete: async () => deleteSecret(secretInput),
        addVersion: async (secretContent) => addNewVersion({ ...secretInput, secretContent }),
        access: async (version) => access({
            ...secretInput,
            secretVersion: version?.toString() || 'latest',
        }),
    };
};
/**
 * the actual project builder itself.
 *
 * Example:
 *
 * ```
 * const secretManager = await makeSecretsWithProject('project/xxxxx');
 * await secretManager.list()
 * ```
 *
 * 1a: because we are using functions for our containers, we can actually
 * use kind of a cool pattern of asynchronous instantiation that we wouldn't otherwise
 * have with es6 classes
 */
const makeSecretsWithProject = (parent) => {
    const client = new secretManager.SecretManagerServiceClient();
    // 1b: what if we wanted to get a list of secrets first to check if the secret exists?
    // const initialSecrets = async listSecrets({ parent, client }),
    return {
        list: async () => listSecrets({ parent, client }),
        versions: async () => versions({ parent, client }),
        client: () => client,
        secret: (secretId) => makeSecrets({ parent, client, secretId }),
    };
};
/** Returns the inherent list of projects auto retrieved when initialized.
 * We want to make sure that we build from lowest needs to greater needs, this
 * will allow us to expand quickly if we want to add functionality to a code
 * base quickly and cleanly
 *
 * Example:
 *
 * ```
 * const secretManager = await makeSecretsWithProject('project/xxxxx');
 * console.log(secretManager.list())
 * ```
 */
const listSecrets = async (input) => {
    const { client, parent } = input;
    const [secrets] = await client.listSecrets({
        parent: parent,
    });
    return secrets;
};
/**
 * List all versions of secrets
 *
 * Example:
 * ```
 * const secretManager = await makeSecretsWithProject('project/xxxxx');
 * console.log(await secretManager.secret('tester').access('latest'));
 *
 */
const versions = async (input) => {
    const { client, parent } = input;
    const [versions] = await client.listSecretVersions({
        parent: parent,
    });
    return versions;
};
/**
 * A simple getSecret function for retrieving a secret
 *
 * Example:
 * ```
 * const secretManager = await makeSecretsWithProject('project/xxxxx');
 * console.log(await secretManager.secret('tester').create())
 * ```
 */
const createSecret = (input) => async () => {
    const { parent, client, secretId } = input;
    const [secret] = await client.createSecret({
        parent,
        secretId,
        secret: {
            replication: {
                automatic: {},
            },
        },
    });
    return secret;
};
/**
 * A simple getSecret function for retrieving a secret
 *
 * Example:
 *
 * ```
 * const secretManager = await makeSecretsWithProject('project/xxxxx');
 * console.log(await secretManager.secret('tester).get())
 * ```
 */
const getSecret = async (input) => {
    const { secretId, client, parent } = input;
    const [secret] = await client.getSecret({
        name: `${parent}/secrets/${secretId}`,
    });
    return secret;
};
/**
 * A simple getSecret function for retrieving a secret
 *
 * Example:
 * ```
 * const secretManager = await makeSecretsWithProject('project/xxxxx');
 * console.log(await secretManager.secret('tester').delete())
 * ```
 */
const deleteSecret = async (input) => {
    const { secretId, client, parent } = input;
    // eslint-disable-next-line functional/no-expression-statement
    return client.deleteSecret({
        name: `${parent}/secrets/${secretId}`,
    });
};
/**
 * Adds a new version to the secret
 *
 * Example:
 * ```
 * const secretManager = await makeSecretsWithProject('project/xxxxx');
 * console.log(await secretManager.secret('tester').delete())
 *
 */
const addNewVersion = async (input) => {
    const { secretId, client, secretContent, parent } = input;
    const [version] = await client.addSecretVersion({
        parent: `${parent}/secrets/${secretId}`,
        payload: {
            data: Buffer.from(secretContent, 'utf8'),
        },
    });
    return version;
};
/**
 * Access version of the secret
 * TODO: Answer the question of whether this should default to _latest_?
 *
 * Example:
 * ```
 * const secretManager = await makeSecretsWithProject('project/xxxxx');
 * console.log(await secretManager.secret('tester').access('latest'));
 *
 */
const access = async (input) => {
    const { secretId, client, secretVersion, parent } = input;
    const [accessResponse] = await client.accessSecretVersion({
        name: `${parent}/secrets/${secretId}/versions/${secretVersion}`,
    });
    return accessResponse?.payload?.data?.toString() ?? null;
};

exports.access = access;
exports.addNewVersion = addNewVersion;
exports.createSecret = createSecret;
exports.deleteSecret = deleteSecret;
exports.getSecret = getSecret;
exports.listSecrets = listSecrets;
exports.makeSecretsWithProject = makeSecretsWithProject;
exports.versions = versions;
