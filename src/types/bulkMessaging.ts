export type CampaignStatus = 'draft' | 'pending' | 'sent' | 'failed' | 'cancelled';
export type CampaignMode = 'customer_list' | 'location';
export type CampaignChannel = 'sms' | 'bale' | 'telegram' | 'whatsapp';
export type CampaignLinkType = 'service' | 'category';

export interface Campaign {
  id: number;
  name: string;
  mode: CampaignMode;
  channels: CampaignChannel[];
  message: string;
  status: CampaignStatus;
  vendor_id: number;
  created_at: string;
  recipients_count?: number;
  delivered_count?: number;
  link_type?: CampaignLinkType;
  link_target_id?: number;
  location_lat?: number;
  location_lng?: number;
  location_radius?: number;
  template_id?: number;
}

export interface BulkCustomer {
  id: number;
  vendor_id: number;
  phone_number: string;
  name: string;
  telegram_chat_id?: string;
  source: string;
  created_at: string;
}

export interface MessageTemplate {
  id: number;
  title: string;
  body: string;
  created_at: string;
}

export interface CreateCampaignPayload {
  name: string;
  mode: CampaignMode;
  channels: CampaignChannel[];
  template_id: number;
  link_type: CampaignLinkType;
  link_target_id: number;
  // customer_list mode
  customer_ids?: number[];
  // location mode
  location_lat?: number;
  location_lng?: number;
  location_radius?: number;
}
