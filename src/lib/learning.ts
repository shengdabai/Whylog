import { isOutcomeReviewComplete } from './decision'
import type { DecisionRecord, OutcomeReview, ReviewVerdict } from '../types'

export interface DecisionLearning {
  rule: string
  lessons: string
  actualOutcome: string
  evidence: string[]
  verdict: Exclude<ReviewVerdict, 'pending'>
  sourceId: string
  sourceTitle: string
  project: string
  tags: string[]
  reviewedAt: string
}

const normalizeText = (value: string) => value.trim().toLowerCase()

function isReviewedDecision(decision: DecisionRecord): decision is DecisionRecord & {
  outcomeReview: OutcomeReview & { verdict: Exclude<ReviewVerdict, 'pending'> }
} {
  return isOutcomeReviewComplete(decision) && decision.outcomeReview.verdict !== 'pending'
}

function decisionSequence(id: string) {
  return Number.parseInt(id.replace(/\D/g, ''), 10) || 0
}

function compareLearningDate(left: DecisionLearning, right: DecisionLearning) {
  if (left.reviewedAt !== right.reviewedAt) return left.reviewedAt < right.reviewedAt ? 1 : -1
  const sequenceDifference = decisionSequence(right.sourceId) - decisionSequence(left.sourceId)
  if (sequenceDifference) return sequenceDifference
  if (left.sourceId === right.sourceId) return 0
  return left.sourceId < right.sourceId ? 1 : -1
}

export function collectDecisionLearnings(decisions: DecisionRecord[]): DecisionLearning[] {
  return decisions
    .filter(isReviewedDecision)
    .map((decision) => ({
      rule: decision.outcomeReview.futureRule.trim(),
      lessons: decision.outcomeReview.lessons.trim(),
      actualOutcome: decision.outcomeReview.actualOutcome.trim(),
      evidence: decision.outcomeReview.evidence.map((item) => item.trim()).filter(Boolean),
      verdict: decision.outcomeReview.verdict,
      sourceId: decision.id,
      sourceTitle: decision.title,
      project: decision.project,
      tags: decision.tags,
      reviewedAt: decision.outcomeReview.reviewedAt,
    }))
    .filter((learning) => learning.rule.length > 0)
    .sort(compareLearningDate)
}

export function relatedDecisionLearnings(
  active: DecisionRecord,
  learnings: DecisionLearning[],
  limit = 3,
): DecisionLearning[] {
  if (limit <= 0) return []
  const project = normalizeText(active.project)
  const tags = new Set(active.tags.map(normalizeText).filter(Boolean))
  return learnings
    .filter((learning) => learning.sourceId !== active.id)
    .map((learning) => {
      const sameProject = project.length > 0 && normalizeText(learning.project) === project
      const sharedTags = learning.tags.reduce((count, tag) => count + (tags.has(normalizeText(tag)) ? 1 : 0), 0)
      return { learning, score: (sameProject ? 10 : 0) + sharedTags }
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || compareLearningDate(left.learning, right.learning))
    .map(({ learning }) => learning)
    .slice(0, limit)
}

export function decisionSearchText(decision: DecisionRecord): string {
  const chosen = decision.options.find((option) => option.chosen)
  const searchable = [
    decision.id,
    decision.title,
    decision.project,
    decision.jobToBeDone,
    decision.desiredOutcome,
    decision.context,
    ...decision.tags,
    ...decision.facts.flatMap((item) => [item.text, item.source]),
    ...decision.assumptions.flatMap((item) => [item.text, item.source]),
    ...decision.drivers,
    ...decision.constraints,
    ...decision.options.flatMap((option) => [option.title, option.description, ...option.pros, ...option.cons, ...option.risks]),
    chosen?.title ?? '',
    decision.choiceReason,
    ...decision.consequences.positive,
    ...decision.consequences.negative,
    ...decision.consequences.neutral,
    decision.confirmation,
    ...decision.reviewTriggers,
    decision.outcomeReview.actualOutcome,
    ...decision.outcomeReview.evidence,
    decision.outcomeReview.lessons,
    decision.outcomeReview.futureRule,
  ]
  return normalizeText(searchable.join(' '))
}

export function learningSearchText(learning: DecisionLearning): string {
  return normalizeText([
    learning.rule,
    learning.lessons,
    learning.actualOutcome,
    ...learning.evidence,
    learning.sourceId,
    learning.sourceTitle,
    learning.project,
    ...learning.tags,
  ].join(' '))
}

export function matchesSearchText(searchText: string, query: string): boolean {
  const normalizedQuery = normalizeText(query)
  if (!normalizedQuery) return true
  return searchText.includes(normalizedQuery)
}

export function matchesDecisionQuery(decision: DecisionRecord, query: string): boolean {
  return matchesSearchText(decisionSearchText(decision), query)
}

export function matchesLearningQuery(learning: DecisionLearning, query: string): boolean {
  return matchesSearchText(learningSearchText(learning), query)
}
