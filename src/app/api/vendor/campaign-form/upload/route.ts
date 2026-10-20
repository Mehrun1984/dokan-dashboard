import { NextRequest, NextResponse } from 'next/server';
import { uploadFieldFile } from '@/lib/wpformsCampaignForm';

export async function POST(request: NextRequest) {
  try {
    const fd = await request.formData();
    const fieldId = Number(fd.get('fieldId'));
    const inputName = String(fd.get('inputName') ?? '');
    const file = fd.get('file');

    if (!Number.isInteger(fieldId) || fieldId <= 0 || !inputName || !(file instanceof File)) {
      return NextResponse.json({ error: 'Missing fieldId, inputName or file' }, { status: 400 });
    }

    const result = await uploadFieldFile(fieldId, inputName, file);
    return NextResponse.json({ data: result.data }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Campaign form file upload failed', message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
