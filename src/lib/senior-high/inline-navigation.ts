const INLINE_ANSWER_SELECTOR = 'input[data-senior-high-inline-answer="true"]';

export function focusNextSeniorHighInlineAnswer(current: HTMLInputElement) {
  const container = current.closest(".senior-high-session, .senior-high-v2-runner") ?? document;
  const inputs = Array.from(container.querySelectorAll<HTMLInputElement>(INLINE_ANSWER_SELECTOR))
    .filter((input) => !input.disabled && input.offsetParent !== null);
  const next = inputs[inputs.indexOf(current) + 1];
  if (!next) return false;
  next.focus();
  next.select();
  return true;
}
