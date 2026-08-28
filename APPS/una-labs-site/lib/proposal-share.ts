export type ShareableProposalProject = {
  id: string;
  name?: string;
  description?: string;
  plan?: string;
  tier?: string;
  billing?: string;
  status?: string;
  ai_price_min_cad?: number | null;
  ai_price_max_cad?: number | null;
  ai_price_rationale?: string | null;
  ai_price_confidence?: string | null;
  ai_price_generated_at?: string | null;
  created_at?: string;
};

export type ShareableProposalMilestone = {
  id: string;
  project_id: string;
  title?: string;
  description?: string;
  due_date?: string;
  status?: string;
  created_at?: string;
};

export type ProposalShareSnapshot = {
  scope: 'proposal_read';
  generated_at: string;
  expires_at: string;
  project: ShareableProposalProject;
  milestones: ShareableProposalMilestone[];
};

type TokenEnvelope = {
  v: 1;
  s: string;
  i: string;
  c: string;
};

function toBase64Url(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }

  let binary = '';
  for (let idx = 0; idx < bytes.length; idx += 1) {
    binary += String.fromCharCode(bytes[idx]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);

  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let idx = 0; idx < binary.length; idx += 1) {
    bytes[idx] = binary.charCodeAt(idx);
  }
  return bytes;
}

function assertCrypto(): Crypto {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Secure sharing requires Web Crypto support in this browser.');
  }
  return crypto;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const webCrypto = assertCrypto();
  const passBytes = new TextEncoder().encode(passphrase);
  const keyMaterial = await webCrypto.subtle.importKey('raw', passBytes, 'PBKDF2', false, ['deriveKey']);

  return webCrypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      iterations: 150000,
      salt,
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function createProposalShareToken(snapshot: ProposalShareSnapshot, passphrase: string): Promise<string> {
  const webCrypto = assertCrypto();
  const normalized = passphrase.trim();
  if (normalized.length < 6) {
    throw new Error('Use a share passcode with at least 6 characters.');
  }

  const payload = new TextEncoder().encode(JSON.stringify(snapshot));
  const salt = webCrypto.getRandomValues(new Uint8Array(16));
  const iv = webCrypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(normalized, salt);

  const encrypted = await webCrypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    payload,
  );

  const envelope: TokenEnvelope = {
    v: 1,
    s: toBase64Url(salt),
    i: toBase64Url(iv),
    c: toBase64Url(new Uint8Array(encrypted)),
  };

  return toBase64Url(new TextEncoder().encode(JSON.stringify(envelope)));
}

export async function readProposalShareToken(token: string, passphrase: string): Promise<ProposalShareSnapshot> {
  const normalized = passphrase.trim();
  if (normalized.length < 6) {
    throw new Error('Enter the passcode shared with this proposal link.');
  }

  let envelope: TokenEnvelope;
  try {
    const decoded = new TextDecoder().decode(fromBase64Url(token));
    envelope = JSON.parse(decoded) as TokenEnvelope;
  } catch {
    throw new Error('This share token is invalid.');
  }

  if (!envelope || envelope.v !== 1 || !envelope.s || !envelope.i || !envelope.c) {
    throw new Error('This share token format is not supported.');
  }

  try {
    const salt = fromBase64Url(envelope.s);
    const iv = fromBase64Url(envelope.i);
    const cipher = fromBase64Url(envelope.c);
    const key = await deriveKey(normalized, salt);

    const plainBuffer = await assertCrypto().subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      cipher,
    );

    const decoded = new TextDecoder().decode(new Uint8Array(plainBuffer));
    const snapshot = JSON.parse(decoded) as ProposalShareSnapshot;

    if (snapshot.scope !== 'proposal_read') {
      throw new Error('Invalid share scope.');
    }

    const expiry = new Date(snapshot.expires_at);
    if (Number.isNaN(expiry.getTime()) || expiry.getTime() < Date.now()) {
      throw new Error('This share link has expired.');
    }

    return snapshot;
  } catch {
    throw new Error('This passcode does not match the shared proposal token.');
  }
}
