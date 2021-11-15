/* eslint-disable functional/functional-parameters */

/** This code was written to be followed along with from top to bottom.  It is meant to show the value
 * of having a functional interface, with object arity of one and controlling what goes into functions interface
 * very strict fashion
 *
 * TODO: how do we make this chain easily? Commonality in needs and dependence inversion
 * TODO: What if we need to add an over arching dependency?
 *
 * NOTE: We disabled functional parameters in this example simply because we will
 * need to use voids in order for some functions to work.
 *
 * Why do i like function declarations more than class instantiations?
 *   - A class is ultimately just an object
 *   - A Function is already a first class citizen in javascript, there was never a need for classes
 *   - A function can be instantiated asynchronously
 *   - A function simply mocks its inputs in a test
 *
 * Why do I like using type based objects versus an interfaced?
 *   - An interface is built on top of classes, which means they can be extended and mutated.
 *   - A type cannot be mutated, so you are always guaranteed whatever that type is.
 *   - A type is easily extendable.
 *   - Ultimately mutation is a very important thing to be wary of, using types decreases chances of dangerous mutation.
 */

import {
  SecretManagerServiceClient,
  protos,
} from '@google-cloud/secret-manager';

/**
 * A declarative base input needed to bootstrap the primary library
 */
export type baseInput = {
  readonly parent: string;
  readonly client: SecretManagerServiceClient;
};

/**
 * This is the required input for any function revolving around a secret.  We will also
 * want to pass in a list of secrets to know if the secret we are working with exists.
 */
export type requiredInput = baseInput & {
  readonly secretId: string;
};

/**
 * A base output that will always be given from the instantiation of the manager
 */
type secretOutput = {
  readonly create: () => unknown;
  readonly get: () => Promise<protos.google.cloud.secretmanager.v1.ISecret>;
  readonly delete: () => Promise<protos.google.protobuf.IEmpty | undefined>;
  readonly addVersion: (
    secretContent: string,
  ) => Promise<protos.google.cloud.secretmanager.v1.ISecretVersion>;
  readonly access: (version?: number) => Promise<string | null>;
};

/**
 * the core output for more general functions and then the secret specific
 * functions
 */
export type baseOutput = {
  readonly client: () => SecretManagerServiceClient;
  readonly list: () => Promise<
    readonly protos.google.cloud.secretmanager.v1.ISecret[]
  >;
  readonly secret: (secretId: string) => secretOutput;
  readonly versions: () => Promise<
    readonly protos.google.cloud.secretmanager.v1.ISecretVersion[]
  >;
};

const makeSecrets = (input: requiredInput): secretOutput => {
  const secretInput = {
    parent: input.parent,
    secretId: input.secretId,
    client: input.client,
  };
  return {
    create: createSecret(secretInput),
    get: async () => getSecret(secretInput),
    delete: async () => deleteSecret(secretInput),
    addVersion: async (secretContent: string) =>
      addNewVersion({ ...secretInput, secretContent }),
    access: async (version?: number) =>
      access({
        ...secretInput,
        secretVersion: version?.toString() || 'latest',
      }),
    accessOnlyLatest: async () =>
      accessOnlyLatest({
        ...secretInput,
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
export const makeSecretsWithProject = (parent: string): baseOutput => {
  const client = new SecretManagerServiceClient();
  // 1b: what if we wanted to get a list of secrets first to check if the secret exists?
  // const initialSecrets = async listSecrets({ parent, client }),
  return {
    list: async () => listSecrets({ parent, client }),
    versions: async () => versions({ parent, client }),
    client: () => client,
    secret: (secretId: string) => makeSecrets({ parent, client, secretId }),
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
export const listSecrets = async (
  input: baseInput,
): Promise<readonly protos.google.cloud.secretmanager.v1.ISecret[]> => {
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
export const versions = async (
  input: baseInput,
): Promise<readonly protos.google.cloud.secretmanager.v1.ISecretVersion[]> => {
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
export const createSecret =
  (input: requiredInput) =>
  async (): Promise<protos.google.cloud.secretmanager.v1.ISecret> => {
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
export const getSecret = async (
  input: requiredInput,
): Promise<protos.google.cloud.secretmanager.v1.ISecret> => {
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
export const deleteSecret = async (
  input: requiredInput,
): Promise<protos.google.protobuf.IEmpty | undefined> => {
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
export const addNewVersion = async (
  input: requiredInput & { readonly secretContent: string },
): Promise<protos.google.cloud.secretmanager.v1.ISecretVersion> => {
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
export const access = async (
  input: requiredInput & { readonly secretVersion: string },
): Promise<string | null> => {
  const { secretId, client, secretVersion, parent } = input;

  const [accessResponse] = await client.accessSecretVersion({
    name: `${parent}/secrets/${secretId}/versions/${secretVersion}`,
  });
  return accessResponse?.payload?.data?.toString() ?? null;
};

export const accessOnlyLatest = async (
  input: requiredInput,
): Promise<string | null> => {
  const { secretId, client, parent } = input;

  const [accessResponse] = await client.accessSecretVersion({
    name: `${parent}/secrets/${secretId}/versions/latest`,
  });
  return accessResponse?.payload?.data?.toString() ?? null;
};
