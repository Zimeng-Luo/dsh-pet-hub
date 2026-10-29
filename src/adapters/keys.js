export function keyCandidates(code) {
  return [code, code.replace(/^Digit/, 'Num'), code.replace(/^(Shift|Control|Alt|Meta)(?:Left|Right)$/, '$1'), /^F\d+$/.test(code) ? 'Fn' : ''];
}
