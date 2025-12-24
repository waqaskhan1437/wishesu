/**
 * Whop webhook metadata helpers.
 */

export async function hydrateMetadataFromDb(env, checkoutSessionId, metadata) {
  if (!checkoutSessionId) return metadata;

  const addons = metadata?.addons || [];
  if (addons.length) return metadata;

  try {
    const sessionRow = await env.DB.prepare(
      'SELECT metadata FROM checkout_sessions WHERE checkout_id = ?'
    ).bind(checkoutSessionId).first();

    if (sessionRow?.metadata) {
      const storedMetadata = JSON.parse(sessionRow.metadata);
      return {
        ...metadata,
        ...storedMetadata,
        addons: storedMetadata.addons || metadata.addons || []
      };
    }
  } catch (e) {
  }

  return metadata;
}
