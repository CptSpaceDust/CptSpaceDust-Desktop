export function shouldSendOnEnter(event) {
  return (
    event.key === "Enter" &&
    !event.shiftKey &&
    !event.isComposing &&
    !event.repeat
  );
}

export function shouldAlertForMessage(current, id, group, focused, visible) {
  return !(current?.id === id && current.group === group && visible);
}
