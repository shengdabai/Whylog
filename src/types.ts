export type DecisionStatus = 'proposed' | 'accepted' | 'rejected' | 'deprecated' | 'superseded'
export type Confidence = 'high' | 'medium' | 'low'
export type EvidenceKind = 'fact' | 'assumption'
export type ReviewVerdict = 'pending' | 'validated' | 'partial' | 'invalidated'

export interface EvidenceItem {
  id: string
  text: string
  source: string
  confidence: Confidence
  kind: EvidenceKind
}

export interface DecisionOption {
  id: string
  title: string
  description: string
  pros: string[]
  cons: string[]
  risks: string[]
  chosen: boolean
}

export interface Consequences {
  positive: string[]
  negative: string[]
  neutral: string[]
}

export interface Traceability {
  prd: string
  requirements: string
  architecture: string
  spec: string
  code: string
  tests: string
}

export interface OutcomeReview {
  verdict: ReviewVerdict
  reviewedAt: string
  actualOutcome: string
  evidence: string[]
  lessons: string
  futureRule: string
}

export interface DecisionRecord {
  id: string
  title: string
  project: string
  status: DecisionStatus
  date: string
  updatedAt: string
  decisionMakers: string[]
  consulted: string[]
  informed: string[]
  jobToBeDone: string
  desiredOutcome: string
  context: string
  facts: EvidenceItem[]
  assumptions: EvidenceItem[]
  drivers: string[]
  constraints: string[]
  options: DecisionOption[]
  choiceReason: string
  consequences: Consequences
  confirmation: string
  reviewDate: string
  reviewTriggers: string[]
  outcomeReview: OutcomeReview
  traceability: Traceability
  tags: string[]
  supersedes: string
}

export interface Workspace {
  schemaVersion: 1
  decisions: DecisionRecord[]
  activeId: string | null
}

export interface QualityResult {
  score: number
  level: 'draft' | 'reviewable' | 'ready'
  missing: string[]
}
