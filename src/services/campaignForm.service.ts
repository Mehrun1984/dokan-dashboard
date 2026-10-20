export interface CampaignFormChoice {
  label: string;
  value: string;
}

export interface CampaignFormField {
  id: number;
  type: string;
  name: string;
  label: string;
  required: boolean;
  description?: string;
  choices?: CampaignFormChoice[];
  file?: {
    inputName: string;
    extensions: string[];
    maxFiles: number;
    maxSizeBytes: number;
  };
}

export interface CampaignFormConditionalRule {
  field: string;
  operator: string;
  value: string;
}

export interface CampaignFormConditional {
  action: 'show' | 'hide';
  rules: CampaignFormConditionalRule[][];
}

export interface CampaignFormDefinition {
  formId: number;
  fields: CampaignFormField[];
  hidden: Record<string, string>;
  conditional: Record<string, CampaignFormConditional>;
  submitText: string;
}

export type CampaignFormUploadData = Record<string, unknown>;

export interface CampaignFormSubmitResult {
  ok: boolean;
  confirmation?: string;
  error?: string;
}

export async function getCampaignFormDefinition(): Promise<CampaignFormDefinition> {
  const res = await fetch('/api/vendor/campaign-form/form');
  if (!res.ok) {
    throw new Error('خطا در دریافت فرم کمپین');
  }
  const payload = await res.json();
  return payload.data;
}

export async function uploadCampaignFormFile(
  fieldId: number,
  inputName: string,
  file: File,
): Promise<CampaignFormUploadData> {
  const fd = new FormData();
  fd.append('fieldId', String(fieldId));
  fd.append('inputName', inputName);
  fd.append('file', file);
  const res = await fetch('/api/vendor/campaign-form/upload', {
    method: 'POST',
    body: fd,
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload?.data) {
    throw new Error(payload?.error ?? 'آپلود فایل ناموفق بود');
  }
  return payload.data;
}

export async function submitCampaignForm(
  values: Record<string, string | string[]>,
): Promise<CampaignFormSubmitResult> {
  const res = await fetch('/api/vendor/campaign-form/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ values }),
  });
  const payload = await res.json().catch(() => null);
  if (!payload) return { ok: false, error: 'پاسخ نامعتبر سرور' };
  return {
    ok: Boolean(payload.ok),
    confirmation: payload.confirmation,
    error: payload.error,
  };
}
