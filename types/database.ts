// Database types for Ascent multi-tenant schema

export type UserRole = 'squad_pm' | 'area_lead_pm' | 'em' | 'admin' | 'governor';

export type WorkSource = 'annual_plan' | 'quarterly_okr' | 'ad_hoc' | 'stakeholder';

export type WorkCategory = 'big_rock' | 'tech_asset' | 'bau';

export type LifecycleStage = 
  | 'idea' 
  | 'backlog' 
  | 'prioritization'
  | 'design' 
  | 'tech_design' 
  | 'coding' 
  | 'qa' 
  | 'uat' 
  | 'partial_live' 
  | 'live' 
  | 'dropped';

export type ImpactBucket = 'growth' | 'profitability' | 'risk' | 'compliance';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type PeriodType = 'annual' | 'quarterly';

export type ConversationType = 
  | 'trueproblem' 
  | 'truerank_overlay' 
  | 'truespec' 
  | 'insights' 
  | 'override_synthesis';

export type ConversationStatus = 'active' | 'completed' | 'abandoned';

export type GovernorDecision = 
  | 'pending' 
  | 'approved_pm' 
  | 'approved_ai' 
  | 'approved_other' 
  | 'rejected';

export type InsightType = 
  | 'coding_window' 
  | 'dfd_expired' 
  | 'impact_lag' 
  | 'backlog_low' 
  | 'override_rate' 
  | 'prediction_accuracy';

export type InsightSeverity = 'info' | 'warning' | 'alert';

export type DateType = 'dfd' | 'eta';

export type ExecutionStage = 'design' | 'tech_design' | 'coding' | 'qa' | 'uat';

// Platform-level tables (public schema)
export interface PlatformOrg {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: 'active' | 'suspended' | 'inactive';
  created_at: string;
  governor_email: string;
}

export interface PlatformUser {
  id: string;
  email: string;
  role: 'super_admin';
  created_at: string;
}

export interface OrgSchemaVersion {
  org_id: string;
  schema_version: number;
  migrated_at: string;
}

// Org-level tables (per org schema)
export interface User {
  id: string;
  email: string;
  name: string;
  designation: string;
  role: UserRole;
  area_lead_id: string | null;
  is_active: boolean;
  invited_at: string;
  activated_at: string | null;
}

export interface Squad {
  id: string;
  name: string;
  size: number;
  type_tag: string;
  engineering_velocity: number;
  sprint_duration_days: number;
  is_active: boolean;
}

export interface SquadMember {
  id: string;
  user_id: string;
  squad_id: string;
  is_primary: boolean;
  role_in_squad: 'pm' | 'em' | 'area_lead';
}

export interface OKR {
  id: string;
  title: string;
  period_type: PeriodType;
  period_tag: string;
  owner_id: string;
  is_active: boolean;
}

export interface WorkItem {
  id: string;
  title: string;
  description: string;
  source: WorkSource;
  work_category: WorkCategory;
  lifecycle_stage: LifecycleStage;
  primary_squad_id: string;
  primary_pm_id: string;
  area_lead_pm_id: string | null;
  primary_em_id: string | null;
  okr_id: string | null;
  impact_bucket_primary: ImpactBucket | null;
  predicted_profitability_cr: number | null;
  predicted_disbursements_cr: number | null;
  predicted_margin_pct: number | null;
  predicted_provisions_cr: number | null;
  predicted_compliance_count: number | null;
  predicted_compliance_pct: number | null;
  impact_confidence_level: ConfidenceLevel | null;
  global_rank: number | null;
  rank_locked: boolean;
  spec_url: string | null;
  ux_complete: boolean;
  spec_complete: boolean;
  intake_conversation_id: string | null;
  dropped_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkItemDependency {
  work_item_id: string;
  dependent_squad_id: string;
  dependent_pm_id: string;
  dependency_type: string;
}

export interface DfdEtaLog {
  id: string;
  work_item_id: string;
  stage: ExecutionStage;
  date_type: DateType;
  committed_date: string;
  previous_date: string | null;
  reason: string;
  logged_by: string;
  logged_at: string;
}

export interface ImpactRecord {
  id: string;
  work_item_id: string;
  record_date: string;
  disbursements_cr: number | null;
  profitability_cr: number | null;
  provisions_saved_cr: number | null;
  compliance_items_done: number | null;
  compliance_pct: number | null;
  notes: string | null;
  logged_by: string;
  logged_at: string;
}

export interface Conversation {
  id: string;
  work_item_id: string | null;
  conversation_type: ConversationType;
  messages: ConversationMessage[];
  status: ConversationStatus;
  user_id: string;
  summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface RankingOverride {
  id: string;
  work_item_id: string;
  ai_recommended_rank: number;
  pm_chosen_rank: number;
  pm_reasoning: string;
  ai_synthesis: string;
  override_conversation_id: string;
  governor_decision: GovernorDecision;
  governor_comment: string | null;
  approved_rank: number | null;
  submitted_at: string;
  resolved_at: string | null;
}

export interface ProactiveInsight {
  id: string;
  squad_id: string;
  insight_type: InsightType;
  severity: InsightSeverity;
  title: string;
  detail: string;
  work_item_id: string | null;
  generated_at: string;
  is_resolved: boolean;
}
