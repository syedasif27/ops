import { Storage } from "@google-cloud/storage";
import { ExternalAccountClient, type AuthClient } from "google-auth-library";
import { getVercelOidcToken } from "@vercel/oidc";

// Server-only. Never import this from a "use client" component.
//
// Three ways to authenticate to GCS, tried in this order:
//
// A) GCS_SERVICE_ACCOUNT_KEY — a base64-encoded service account JSON key.
//    Only works if your GCP org allows service account key creation.
//    Many orgs disable this (iam.disableServiceAccountKeyCreation), in
//    which case skip straight to (B).
//
// B) Workload Identity Federation via Vercel's OIDC token — no keys at
//    all. Requires GCP_PROJECT_NUMBER, GCP_SERVICE_ACCOUNT_EMAIL,
//    GCP_WORKLOAD_IDENTITY_POOL_ID, GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID
//    to be set (see README "GCP Cloud Storage" section). This is what
//    actually runs when deployed on Vercel with key creation disabled.
//
// C) Application Default Credentials — picked up automatically if neither
//    of the above is configured, e.g. after running
//    `gcloud auth application-default login` locally, or when running on
//    a GCP compute service with an attached service account.
const bucketName = process.env.GCS_BUCKET_NAME;
const encodedKey = process.env.GCS_SERVICE_ACCOUNT_KEY;

const gcpProjectId = process.env.GCP_PROJECT_ID;
const gcpProjectNumber = process.env.GCP_PROJECT_NUMBER;
const gcpServiceAccountEmail = process.env.GCP_SERVICE_ACCOUNT_EMAIL;
const gcpPoolId = process.env.GCP_WORKLOAD_IDENTITY_POOL_ID;
const gcpProviderId = process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID;

const wifConfigured = Boolean(gcpProjectNumber && gcpServiceAccountEmail && gcpPoolId && gcpProviderId);

let storage: Storage | null = null;

function buildWifAuthClient(): AuthClient {
  return ExternalAccountClient.fromJSON({
    type: "external_account",
    audience: `//iam.googleapis.com/projects/${gcpProjectNumber}/locations/global/workloadIdentityPools/${gcpPoolId}/providers/${gcpProviderId}`,
    subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
    token_url: "https://sts.googleapis.com/v1/token",
    service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${gcpServiceAccountEmail}:generateAccessToken`,
    subject_token_supplier: {
      // Called lazily per-request by google-auth-library — must NOT be
      // invoked at module load time, only from within a request handler.
      getSubjectToken: () => getVercelOidcToken(),
    },
  }) as AuthClient;
}

function getStorage(): Storage {
  if (storage) return storage;

  if (encodedKey) {
    const credentials = JSON.parse(Buffer.from(encodedKey, "base64").toString("utf-8"));
    storage = new Storage({ projectId: credentials.project_id, credentials });
    console.log("[gcs] Using service-account-key auth.");
    return storage;
  }

  if (wifConfigured) {
    storage = new Storage({ projectId: gcpProjectId, authClient: buildWifAuthClient() });
    console.log("[gcs] Using Workload Identity Federation (Vercel OIDC) auth.");
    return storage;
  }

  console.warn(
    "[gcs] Neither GCS_SERVICE_ACCOUNT_KEY nor the GCP_* Workload Identity " +
      "Federation variables are set. Falling back to Application Default " +
      "Credentials — this only works if the environment already has them " +
      "(e.g. `gcloud auth application-default login` locally)."
  );
  storage = new Storage({ projectId: gcpProjectId });
  return storage;
}

export function getAuthMethod(): "service-account-key" | "workload-identity-federation" | "application-default-credentials" {
  if (encodedKey) return "service-account-key";
  if (wifConfigured) return "workload-identity-federation";
  return "application-default-credentials";
}

function getBucket() {
  if (!bucketName) {
    throw new Error("GCS_BUCKET_NAME is not set.");
  }
  return getStorage().bucket(bucketName);
}

/** Upload a file buffer to GCS. Returns the object path within the bucket. */
export async function uploadToGcs(opts: {
  objectPath: string;
  buffer: Buffer;
  contentType?: string;
}): Promise<string> {
  const bucket = getBucket();
  const file = bucket.file(opts.objectPath);
  await file.save(opts.buffer, {
    contentType: opts.contentType || "application/octet-stream",
  });
  return opts.objectPath;
}

/**
 * Generate a short-lived signed URL to read a private object.
 * Note: signing requires either a service-account-key client or a WIF
 * client that's impersonating a service account (both supported here);
 * pure ADC user credentials cannot sign URLs.
 */
export async function getSignedReadUrl(objectPath: string, expiresInMs = 15 * 60 * 1000): Promise<string> {
  const bucket = getBucket();
  const file = bucket.file(objectPath);
  const [url] = await file.getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + expiresInMs,
  });
  return url;
}

export async function deleteFromGcs(objectPath: string): Promise<void> {
  const bucket = getBucket();
  await bucket.file(objectPath).delete({ ignoreNotFound: true });
}

export function isGcsConfigured(): boolean {
  return Boolean(bucketName && (encodedKey || wifConfigured || process.env.GOOGLE_APPLICATION_CREDENTIALS));
}
