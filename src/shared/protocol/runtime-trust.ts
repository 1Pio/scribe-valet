export const RUNTIME_TRUST_STATUS = {
  VERIFIED: "verified",
  UNCONFIRMED: "unconfirmed"
} as const;

export type RuntimeTrustStatus =
  (typeof RUNTIME_TRUST_STATUS)[keyof typeof RUNTIME_TRUST_STATUS];

export type RuntimeTrustCheck = {
  name: string;
  passed: boolean;
  detail: string;
};

export type RuntimeTrustProcessObservation = {
  pid: number;
  type: string;
  name?: string;
  serviceName?: string;
};

export type RuntimeTrustDetails = {
  checkedAtIso: string;
  checks: RuntimeTrustCheck[];
  processes: RuntimeTrustProcessObservation[];
  findings: string[];
};

export type RuntimeTrustResult = {
  status: RuntimeTrustStatus;
  headline: string;
  summary: string;
  details: RuntimeTrustDetails;
};

export type RuntimeTrustSnapshot = RuntimeTrustResult & {
  report: string;
};

export type RuntimeTrustCopyResult = {
  ok: boolean;
  report: string;
};
