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
export type secretOutput = {
  readonly create: () => unknown;
  readonly get: () => Promise<protos.google.cloud.secretmanager.v1.ISecret>;
  readonly delete: () => Promise<protos.google.protobuf.IEmpty | undefined>;
};
