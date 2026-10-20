import { NextRequest, NextResponse } from 'next/server';
import { submitFormValues } from '@/lib/wpformsCampaignForm';

interface SubmitBody {
  values?: Record<string, string | string[]>;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SubmitBody;
    const values = body?.values;
    if (!values || typeof values !== 'object') {
      return NextResponse.json({ error: 'values are required' }, { status: 400 });
    }

    const result = await submitFormValues(values);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error('Campaign form submit failed', detail);
    return NextResponse.json({ ok: false, error: detail }, { status: 502 });
  }
}
