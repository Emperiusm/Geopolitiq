import { Worker } from '@temporalio/worker';
import { writeSignalActivity, dlqSignalActivity } from '../activities/system';
import { graphActivity } from '../activities/graph';
import { publishActivity } from '../activities/publish';

async function main() {
  const worker = await Worker.create({
    workflowsPath: require.resolve('../workflows/signal-batch'),
    activities: { writeSignalActivity, dlqSignalActivity, graphActivity, publishActivity },
    taskQueue: 'write',
    maxConcurrentActivityTaskExecutions: 25,
  });
  await worker.run();
}

main().catch(console.error);
