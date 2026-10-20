import { NextResponse } from 'next/server';
import { fetchCampaignFormDefinition } from '@/lib/wpformsCampaignForm';

export async function GET() {
  try {
    const definition = await fetchCampaignFormDefinition();
    return NextResponse.json({ data: definition }, { status: 200 });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error('Campaign form fetch failed', detail);
    return NextResponse.json({ error: 'Failed to load campaign form', detail }, { status: 502 });
  }
}
