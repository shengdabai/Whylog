import type { DecisionRecord, QualityResult } from '../types'
import { isOutcomeReviewComplete, isReviewDue, isValidDate, localDate } from './decision'

const filled = (value: string) => value.trim().length > 0
const filledList = (values: string[]) => values.filter(filled)

export function assessDecision(decision: DecisionRecord, today = localDate()): QualityResult {
  let score = 0
  const missing: string[] = []
  const check = (condition: boolean, points: number, message: string) => {
    if (condition) score += points
    else missing.push(message)
  }

  check(filled(decision.jobToBeDone), 10, '说明这个决定要完成的 Job')
  check(filled(decision.desiredOutcome), 5, '写出可观察的目标结果')
  check(filled(decision.context), 10, '补全问题上下文')
  check(decision.facts.some((item) => filled(item.text) && filled(item.source)), 10, '至少记录一条有来源的已知事实')
  check(decision.assumptions.some((item) => filled(item.text) && filled(item.source)), 5, '显式记录一条有来源的待验证假设')
  check(filledList(decision.drivers).length > 0, 5, '列出决策驱动因素')
  check(filledList(decision.constraints).length > 0, 5, '列出不能违反的约束')

  const options = decision.options.filter((option) => filled(option.title))
  check(options.length >= 2, 10, '至少比较两个候选方案')
  check(options.filter((option) => option.chosen).length === 1, 10, '明确且只选择一个方案')
  check(filled(decision.choiceReason), 15, '写清为什么选它、排除其他方案')
  check(
    filledList(decision.consequences.positive).length > 0 && filledList(decision.consequences.negative).length > 0,
    5,
    '同时记录收益与代价',
  )
  check(filled(decision.confirmation), 5, '定义如何确认决策被正确执行')
  check(isValidDate(decision.reviewDate) || filledList(decision.reviewTriggers).length > 0, 5, '设置有效重审日期或触发条件')

  if (isReviewDue(decision, today) && !isOutcomeReviewComplete(decision)) {
    score = Math.min(score, 90)
    missing.push('完成到期复盘：结论、实际结果、证据、核心教训与未来规则')
  }

  const level: QualityResult['level'] = score >= 85 ? 'ready' : score >= 60 ? 'reviewable' : 'draft'
  return { score, level, missing }
}
