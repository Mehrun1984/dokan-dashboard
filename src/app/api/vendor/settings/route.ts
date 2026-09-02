import { NextRequest, NextResponse } from 'next/server';

const WP_API_URL = process.env.NEXT_PUBLIC_WP_API_URL;

function buildWpSettingsUrl() {
  if (!WP_API_URL) {
    return null;
  }

  const base = WP_API_URL.endsWith('/') ? WP_API_URL.slice(0, -1) : WP_API_URL;
  return `${base}/dokan/v1/settings`;
}

function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function parseJsonSafely(text: string) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

function buildWpMediaUrl(id: number) {
  if (!WP_API_URL) {
    return null;
  }

  const base = WP_API_URL.endsWith('/') ? WP_API_URL.slice(0, -1) : WP_API_URL;
  return `${base}/wp/v2/media/${id}`;
}

function parseAttachmentId(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
}

async function resolveMediaDetails(media: unknown, token: string) {
  const attachmentId = parseAttachmentId(media);
  if (!attachmentId) {
    return media;
  }

  const mediaUrl = buildWpMediaUrl(attachmentId);
  if (!mediaUrl) {
    return media;
  }

  try {
    const res = await fetch(mediaUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return media;
    }

    const payload = await res.json().catch(() => null);
    const sourceUrl = typeof payload?.source_url === 'string' ? payload.source_url : null;
    const mediumUrl = typeof payload?.media_details?.sizes?.medium?.source_url === 'string'
      ? payload.media_details.sizes.medium.source_url
      : null;
    const thumbnailUrl = typeof payload?.media_details?.sizes?.thumbnail?.source_url === 'string'
      ? payload.media_details.sizes.thumbnail.source_url
      : null;

    return {
      id: attachmentId,
      url: sourceUrl,
      src: sourceUrl,
      thumbnail: thumbnailUrl,
      sizes: {
        medium: mediumUrl ? { url: mediumUrl } : undefined,
        thumbnail: thumbnailUrl ? { url: thumbnailUrl } : undefined,
      },
    };
  } catch {
    return media;
  }
}

async function enrichSettingsMedia(payload: unknown, token: string) {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  const settings = payload as Record<string, unknown>;
  const [gravatar, banner] = await Promise.all([
    resolveMediaDetails(settings.gravatar, token),
    resolveMediaDetails(settings.banner, token),
  ]);

  return {
    ...settings,
    gravatar,
    banner,
  };
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get('vendor_jwt')?.value;
  const targetUrl = buildWpSettingsUrl();

  if (!token) {
    return unauthorizedResponse();
  }

  if (!targetUrl) {
    return NextResponse.json({ error: 'WP API URL is not configured' }, { status: 500 });
  }

  try {
    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const text = await res.text();
    const payload = parseJsonSafely(text);

    if (!res.ok) {
      return NextResponse.json(payload ?? { error: 'Failed to fetch settings' }, { status: res.status });
    }

    const enrichedPayload = await enrichSettingsMedia(payload, token);
    return NextResponse.json(enrichedPayload, { status: 200 });
  } catch (error) {
    console.error('Vendor settings proxy GET failed', error);
    return NextResponse.json({ error: 'Failed to fetch vendor settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const token = request.cookies.get('vendor_jwt')?.value;
  const targetUrl = buildWpSettingsUrl();

  if (!token) {
    return unauthorizedResponse();
  }

  if (!targetUrl) {
    return NextResponse.json({ error: 'WP API URL is not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();

    const res = await fetch(targetUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const text = await res.text();
    const payload = parseJsonSafely(text);

    if (!res.ok) {
      return NextResponse.json(payload ?? { error: 'Failed to update settings' }, { status: res.status });
    }

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error('Vendor settings proxy PUT failed', error);
    return NextResponse.json({ error: 'Failed to update vendor settings', detail }, { status: 500 });
  }
}