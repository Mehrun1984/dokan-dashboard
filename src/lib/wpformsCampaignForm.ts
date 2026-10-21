interface WpFormsChoice {
  label: string;
  value: string;
}

export interface WpFormsField {
  id: number;
  type: string;
  name: string;
  label: string;
  required: boolean;
  description?: string;
  choices?: WpFormsChoice[];
  file?: {
    inputName: string;
    extensions: string[];
    maxFiles: number;
    maxSizeBytes: number;
  };
}

export interface WpFormsConditionalRule {
  field: string;
  operator: string;
  value: string;
  type?: string;
}

export interface WpFormsConditional {
  action: 'show' | 'hide';
  rules: WpFormsConditionalRule[][];
}

export interface WpFormsDefinition {
  formId: number;
  fields: WpFormsField[];
  hidden: Record<string, string>;
  conditional: Record<string, WpFormsConditional>;
  submitText: string;
}

const FORM_ID = 2003;
const FORM_PAGE_PATH = '/social-campaign-form/';

const WP_API_URL = process.env.NEXT_PUBLIC_WP_API_URL ?? 'https://beautyme24.com/wp-json';

function wpOrigin(): string {
  try {
    const stripped = WP_API_URL.replace(/\/wp-json\/?$/i, '');
    return new URL(stripped).origin;
  } catch {
    return 'https://beautyme24.com';
  }
}

function ajaxUrl(): string {
  return `${wpOrigin()}/wp-admin/admin-ajax.php`;
}

export function formPageUrl(): string {
  return `${wpOrigin()}${FORM_PAGE_PATH}`;
}

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
};

const CONTAINER_TAG_RE = /<div\s+id="wpforms-(\d+)-field_(\d+)-container"([^>]*)>/g;

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function stripTags(html: string): string {
  const text = html.replace(/<[^>]*>/g, ' ');
  return decodeEntities(text).replace(/\s+/g, ' ').trim();
}

function firstMatch(html: string, re: RegExp, groupIndex = 1): string | undefined {
  const groupsArr = re.exec(html);
  if (!groupsArr) return undefined;
  const values = [...groupsArr];
  if (groupIndex < values.length) {
    return values[groupIndex];
  }
  if (groupsArr.groups) {
    const found = Object.values(groupsArr.groups).find((g) => g !== undefined);
    return typeof found === 'string' ? found : undefined;
  }
  return undefined;
}

/** Returns the first non-empty capture group of the first match. */
function firstNonEmptyCapture(html: string, re: RegExp): string {
  const m = re.exec(html);
  if (!m) return '';
  const found = m.slice(1).find((g) => g !== undefined && g !== '');
  return found ?? '';
}

async function fetchFormPageHtml(): Promise<string> {
  const res = await fetch(formPageUrl(), {
    headers: BROWSER_HEADERS,
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch form page: HTTP ${res.status}`);
  }
  return res.text();
}

function parseConditionalLogic(html: string): Record<string, WpFormsConditional> {
  const marker = 'conditional_logic';
  const idx = html.indexOf(marker);
  if (idx < 0) return {};
  const start = html.indexOf('{', idx);
  if (start < 0) return {};
  // Balanced-brace scan
  let depth = 0;
  let end = -1;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) return {};

  try {
    const parsed = JSON.parse(html.slice(start, end + 1)) as Record<
      string,
      Record<string, { logic: WpFormsConditionalRule[][]; action: string }>
    >;
    const forms = parsed[String(FORM_ID)] ?? Object.values(parsed)[0];
    if (!forms) return {};

    const result: Record<string, WpFormsConditional> = {};
    for (const [fieldId, entry] of Object.entries(forms)) {
      result[fieldId] = {
        action: (entry.action === 'hide' ? 'hide' : 'show') as WpFormsConditional['action'],
        rules: (entry.logic ?? []).map((row) =>
          row.map((rule) => ({
            field: String(rule.field),
            operator: rule.operator ?? '==',
            value: rule.value ?? '',
          })),
        ),
      };
    }
    return result;
  } catch {
    return {};
  }
}

function parseField(segment: string, formId: string, id: string, attributes: string): WpFormsField | null {
  const type = firstMatch(attributes, /data-field-type="([\w-]+)"/) ?? '';
  if (type === 'layout' || type === 'divider' || type === 'pagebreak') {
    return null;
  }
  if (!segment) return null;

  const required = /wpforms-field-required/.test(attributes) || /wpforms-field-required/.test(segment);
  const labelHtml =
    firstMatch(segment, /<label class="wpforms-field-label"[^>]*>([\s\S]*?)<\/label>/) ??
    firstMatch(segment, /<legend class="wpforms-field-label"[^>]*>([\s\S]*?)<\/legend>/) ??
    '';
  const label = stripTags(labelHtml).replace(/\s*\*\s*$/, '').trim();
  const description = stripTags(
    firstMatch(
      segment,
      /<div id="wpforms-\d+-field_\d+-description"\s+class="wpforms-field-description"[^>]*>([\s\S]*?)<\/div>/,
    ) ?? '',
  );

  const isFile = type === 'file-upload';
  const isDate = type === 'jalali-date-time' || type === 'jalali-date' || type === 'jalali-time';
  const isChoice = type === 'radio' || type === 'select' || type === 'checkbox';

  let name = '';
  if (isFile) {
    name =
      firstMatch(segment, new RegExp(`data-input-name="(wpforms_${formId}_${id})"`)) ?? '';
  } else if (isDate) {
    name = firstMatch(segment, new RegExp(`name="wpforms\\[fields\\]\\[${id}\\]\\[\\w+\\]"`)) ?? '';
  } else {
    name = firstMatch(segment, new RegExp(`name="wpforms\\[fields\\]\\[${id}\\]"`)) ?? '';
  }

  if (!name) {
    const anyInput = firstMatch(segment, /name="([^"]+)"/);
    if (anyInput && !isFile) {
      name = anyInput;
    } else {
      return null;
    }
  }

  const field: WpFormsField = {
    id: Number(id),
    type,
    name,
    label,
    required,
    description: description || undefined,
  };

  if (isChoice) {
    // Collect each choice <input> in order; the value lives inside the same tag.
    const inputTags: string[] = [
      ...segment.matchAll(new RegExp(`<input[^>]*name="wpforms\\[fields\\]\\[${id}\\]"[^>]*>`, 'g')),
    ].map((m) => m[0]);
    const valOf = (tag: string) =>
      firstNonEmptyCapture(
        tag,
        new RegExp(`value="([^"]*)"\\s+name="wpforms\\[fields\\]\\[${id}\\]"|name="wpforms\\[fields\\]\\[${id}\\]"\\s+value="([^"]*)"|value="([^"]*)"[^>]*name="wpforms\\[fields\\]\\[${id}\\]"`),
      );
    const values = inputTags.map((t) => {
      const v = valOf(t);
      return v ?? '';
    });

    // Fallback: select fields use <option>
    if (values.length === 0) {
      const opts = [...segment.matchAll(new RegExp(`<option[^>]*value="([^"]*)"[^>]*>([^<]*)<`, 'g'))].map(
        (m) => m[1],
      );
      const optLabels = [...segment.matchAll(new RegExp(`<option[^>]*value="[^"]*"[^>]*>([^<]*)<`, 'g'))].map(
        (m) => m[1],
      );
      field.choices = opts.map((v, idx) => ({ value: v, label: stripTags(optLabels[idx] ?? v) || v }));
    } else {
      // Icon/image choices put the label span after (or around) each input.
      const choiceLabels = [
        ...segment.matchAll(
          /<span[^>]*class="[^"]*wpforms-(?:icon-choices-label|image-choices-label)[^"]*"[^>]*>([\s\S]*?)<\/span>/g,
        ),
      ].map((m) => stripTags(m[1]));
      // List-style checkboxes/radios use <span class="wpforms-field-label-inline"> as a real element
      const inlineLabels = [
        ...segment.matchAll(/<span[^>]*class="[^"]*wpforms-field-label-inline[^"]*"[^>]*>([\s\S]*?)<\/span>/g),
      ].map((m) => stripTags(m[1]));
      const pickSource =
        choiceLabels.length === values.length
          ? choiceLabels
          : inlineLabels.length === values.length
            ? inlineLabels
            : [];
      field.choices = values.map((v, idx) => ({ value: v, label: pickSource[idx] || v }));
    }
  }

  if (isFile) {
    field.file = {
      inputName: name,
      extensions: (firstMatch(segment, /data-extensions="([^"]*)"/) ?? '')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
      maxFiles: Number(firstMatch(segment, /data-max-file-number="(\d+)"/) ?? 1),
      maxSizeBytes: Number(firstMatch(segment, /data-max-size="(\d+)"/) ?? 0),
    };
  }

  return field;
}

export async function fetchCampaignFormDefinition(pageHtml?: string): Promise<WpFormsDefinition> {
  const html = pageHtml ?? (await fetchFormPageHtml());

  const formStart = html.indexOf(`wpforms-form-${FORM_ID}`);
  if (formStart < 0) {
    throw new Error('Form markup not found on page');
  }
  const formEnd = html.indexOf('</form>', formStart);
  const formHtml = html.slice(formStart, formEnd > formStart ? formEnd : html.length);

  // Hidden inputs needed to submit exactly like the site does.
  const hidden: Record<string, string> = {};
  for (const m of formHtml.matchAll(
    /<input type="hidden" name="((?:wpforms|page_title|page_id|url_referer)\[[^\]]*\]|wpforms\[[^\]]*\]|page_(?:title|url|id)|url_referer)"\s+value="([^"]*)"/g,
  )) {
    hidden[m[1]] = m[2];
  }

  // Dropzone-style hidden upload inputs (wpforms_{formId}_{fieldId})
  for (const m of formHtml.matchAll(
    new RegExp(`<input[^>]+name="wpforms_${FORM_ID}_(\\d+)"[^>]+value="([^"]*)"`, 'g'),
  )) {
    hidden[`wpforms_${FORM_ID}_${m[1]}`] = m[2];
  }

  const token = firstMatch(formHtml, /data-token="([^"]*)"/) ?? '';
  const tokenTime = firstMatch(formHtml, /data-token-time="(\d+)"/) ?? '';
  if (token) hidden['__token'] = token;
  if (tokenTime) hidden['__token_time'] = tokenTime;

  const submitText =
    firstMatch(formHtml, /<button[^>]*class="[^"]*wpforms-submit[^"]*"[^>]*data-submit-text="([^"]*)"/g) ?? '';

  // Fields in document order
  const containerTags = [...formHtml.matchAll(CONTAINER_TAG_RE)];
  const fields: WpFormsField[] = [];
  containerTags.forEach((m, i) => {
    const [, formId, id, attrs] = m;
    const segStart = m.index;
    const segEnd = i + 1 < containerTags.length ? containerTags[i + 1].index : formHtml.length;
    const segment = formHtml.slice(segStart, segEnd);
    const field = parseField(segment, formId, id, attrs);
    if (field && field.id !== 1) fields.push(field);
  });

  return {
    formId: FORM_ID,
    fields,
    hidden,
    conditional: parseConditionalLogic(html),
    submitText,
  };
}

function extractSubmitError(payload: unknown): string | undefined {
  if (payload && typeof payload === 'object' && 'data' in (payload as Record<string, unknown>)) {
    const data = (payload as { data: unknown }).data;
    if (typeof data === 'string' && data.trim()) return data;
    if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      for (const key of ['error', 'message', 'global_error']) {
        const v = obj[key];
        if (typeof v === 'string' && v.trim()) return v;
      }
    }
  }
  if (payload && typeof payload === 'object' && 'message' in (payload as Record<string, unknown>)) {
    const v = (payload as { message: unknown }).message;
    if (typeof v === 'string' && v.trim()) return v;
  }
  return undefined;
}

export interface SubmitResult {
  ok: boolean;
  confirmation?: string;
  error?: string;
}

export async function submitFormValues(
  values: Record<string, string | string[]>,
): Promise<SubmitResult> {
  // Fresh page load (and parse) so hidden-token values are always current for this server session.
  const fresh = await fetchCampaignFormDefinition();

  const fd = new FormData();
  for (const [name, value] of Object.entries(fresh.hidden)) {
    if (name === '__token' || name === '__token_time') continue;
    fd.append(name, value);
  }
  fd.append('action', 'wpforms_submit');
  fd.append('url_referer', '');
  for (const [name, value] of Object.entries(values)) {
    if (Array.isArray(value)) {
      value.forEach((v) => fd.append(name, v));
    } else if (value !== '' && value !== undefined && value !== null) {
      fd.append(name, value);
    }
  }

  const res = await fetch(ajaxUrl(), {
    method: 'POST',
    body: fd,
    headers: BROWSER_HEADERS,
  });
  const text = await res.text();
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Invalid response from server' };
  }

  const success = !!(payload as Record<string, unknown>)?.success;
  if (!success) {
    return { ok: false, error: extractSubmitError(payload) ?? 'ارسال فرم ناموفق بود' };
  }
  const dataObj = (payload as { data?: Record<string, unknown> }).data;
  const confirmation =
    dataObj && typeof dataObj.confirmation === 'string'
      ? stripTags(dataObj.confirmation).slice(0, 200)
      : undefined;
  return { ok: true, confirmation };
}

export interface UploadResult {
  data: Record<string, unknown>;
}

function generateDzuuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  let out = '';
  for (let i = 0; i < 16; i++) {
    out += Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0');
  }
  return `${out.slice(0, 8)}-${out.slice(8, 12)}-4${out.slice(13, 16)}-8${out.slice(17, 20)}-${out.slice(20, 32)}`;
}

// Mirrors the WPForms chunked upload protocol captured from the real page JS
// (Dropzone). Init must carry the dz* chunk params or the handler answers 403;
// dzchunksize in chunk/finalize requests is the negotiated chunk size itself.
const DZ_DEFAULT_CHUNK_SIZE = 524288;

export async function uploadFieldFile(
  fieldId: number,
  inputName: string,
  file: File,
  formId: number = FORM_ID,
): Promise<UploadResult> {
  const dzuuid = generateDzuuid();
  const initBody = new URLSearchParams({
    action: 'wpforms_upload_chunk_init',
    form_id: String(formId),
    field_id: String(fieldId),
    name: file.name,
    slow: 'false',
    dzuuid,
    dzchunkindex: '0',
    dztotalfilesize: String(file.size),
    dzchunksize: String(DZ_DEFAULT_CHUNK_SIZE),
    dzchunkbyteoffset: '0',
  });
  const initRes = await fetch(ajaxUrl(), {
    method: 'POST',
    body: initBody,
    headers: BROWSER_HEADERS,
  });
  const initText = await initRes.text();
  let initPayload: { success?: boolean; data?: Record<string, unknown>; [k: string]: unknown };
  try {
    initPayload = JSON.parse(initText);
  } catch {
    throw new Error('Upload init failed');
  }
  if (!initPayload.success) {
    throw new Error(extractSubmitError(initPayload) ?? 'Upload failed');
  }

  const chunkSize = Number(initPayload.data?.dzchunksize) || DZ_DEFAULT_CHUNK_SIZE;
  const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize));

  let lastData: Record<string, unknown> = {};
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const blob = file.slice(start, end);
    const fd = new FormData();
    fd.append('action', 'wpforms_upload_chunk');
    fd.append('form_id', String(formId));
    fd.append('field_id', String(fieldId));
    fd.append('dzuuid', dzuuid);
    fd.append('dzchunkindex', String(i));
    fd.append('dztotalfilesize', String(file.size));
    fd.append('dzchunksize', String(chunkSize));
    fd.append('dztotalchunkcount', String(totalChunks));
    fd.append('dzchunkbyteoffset', String(start));
    fd.append(inputName, blob, file.name);
    const chunkRes = await fetch(ajaxUrl(), { method: 'POST', body: fd, headers: BROWSER_HEADERS });
    const chunkText = await chunkRes.text();
    let chunkPayload: { success?: boolean; data?: Record<string, unknown>; [k: string]: unknown };
    try {
      chunkPayload = JSON.parse(chunkText);
    } catch {
      throw new Error('Chunk upload failed');
    }
    if (!chunkPayload.success) {
      throw new Error(extractSubmitError(chunkPayload) ?? 'Chunk upload failed');
    }
    if (chunkPayload.data) lastData = chunkPayload.data;
  }

  // Tell the site all chunks are in; final data object (with file hash) is what the field input stores.
  const finishBody = new URLSearchParams();
  finishBody.set('action', 'wpforms_file_chunks_uploaded');
  finishBody.set('form_id', String(formId));
  finishBody.set('field_id', String(fieldId));
  finishBody.set('name', file.name);
  finishBody.set('dzuuid', dzuuid);
  finishBody.set('dzchunkindex', '0');
  finishBody.set('dztotalfilesize', String(file.size));
  finishBody.set('dzchunksize', String(chunkSize));
  finishBody.set('dztotalchunkcount', String(totalChunks));
  finishBody.set('dzchunkbyteoffset', '0');
  const finishRes = await fetch(ajaxUrl(), {
    method: 'POST',
    body: finishBody,
    headers: BROWSER_HEADERS,
  });
  const finishText = await finishRes.text();
  let finishPayload: { success?: boolean; data?: Record<string, unknown>; [k: string]: unknown };
  try {
    finishPayload = JSON.parse(finishText);
  } catch {
    throw new Error('Finalize upload failed');
  }
  if (!finishPayload.success) {
    throw new Error(extractSubmitError(finishPayload) ?? 'Finalize upload failed');
  }
  return { data: (finishPayload.data ?? lastData) as Record<string, unknown> };
}
