/** Each queue has its own non-overlapping loop, so slow delivery cannot stall safety. */
export function startPollingWorker(
  work: () => Promise<void>,
  onError: () => void,
  interval = 5000,
) {
  let running: Promise<void> | undefined;
  let stopped = false;
  const run = () => {
    if (stopped || running) return;
    running = Promise.resolve()
      .then(work)
      .catch(onError)
      .finally(() => {
        running = undefined;
      });
  };
  const timer = setInterval(run, interval);
  run();
  return async () => {
    stopped = true;
    clearInterval(timer);
    await running;
  };
}
