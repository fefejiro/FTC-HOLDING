export function classifyReply({ subject = '', body = '' } = {}) {
  const text = `${subject}\n${body}`.toLowerCase()

  if (/\bunsubscribe\b|remove me|do not contact|stop emailing/.test(text)) {
    return { classification: 'unsubscribe', needsHuman: true }
  }
  if (/out of office|automatic reply|auto-?reply|away from the office/.test(text)) {
    return { classification: 'auto_reply', needsHuman: false }
  }
  if (/not interested|no thanks|not a fit|no need/.test(text)) {
    return { classification: 'not_interested', needsHuman: false }
  }
  if (/interested|tell me more|book|schedule|available|call|meeting|pilot|proposal/.test(text)) {
    return { classification: 'positive', needsHuman: true }
  }
  if (text.trim().length < 20) {
    return { classification: 'noise', needsHuman: false }
  }
  return { classification: 'needs_human', needsHuman: true }
}
