const encoder = new TextEncoder();

const toHex = (buffer) =>
  [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');

const hmac = async (key, data) => {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
};

const sha256Hex = async (data) => {
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return toHex(hash);
};

const amzDate = (date) =>
  date.toISOString().replace(/[:-]|\.\d{3}/g, '');

const encodePath = (key) =>
  key.split('/').map((part) => encodeURIComponent(part)).join('/');

export async function createPresignedPutUrl({
  accessKeyId,
  secretAccessKey,
  accountId,
  bucket,
  key,
  expires = 900
}) {
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const region = 'auto';
  const service = 's3';
  const now = new Date();
  const dateTime = amzDate(now);
  const dateStamp = dateTime.slice(0, 8);
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const canonicalUri = `/${bucket}/${encodePath(key)}`;

  const query = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${accessKeyId}/${scope}`,
    'X-Amz-Date': dateTime,
    'X-Amz-Expires': String(expires),
    'X-Amz-SignedHeaders': 'host'
  });

  const canonicalHeaders = `host:${host}\n`;
  const canonicalRequest =
    `PUT\n${canonicalUri}\n${query.toString()}\n${canonicalHeaders}\nhost\nUNSIGNED-PAYLOAD`;
  const stringToSign =
    `AWS4-HMAC-SHA256\n${dateTime}\n${scope}\n${await sha256Hex(canonicalRequest)}`;

  const kDate = await hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  const kSigning = await hmac(kService, 'aws4_request');
  const signature = toHex(await hmac(kSigning, stringToSign));

  query.set('X-Amz-Signature', signature);
  return `https://${host}${canonicalUri}?${query.toString()}`;
}
