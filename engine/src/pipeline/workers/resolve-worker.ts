import { Worker } from '@temporalio/worker';
import { resolveActivity } from '../activities/resolve';

async function main() {
  const worker = await Worker.create({
    workflowsPath: require.resolve('../workflows/source-ingestion'),
    activities: { resolveActivity },
    taskQueue: 'resolve',
    maxConcurrentActivityTaskExecutions: 25,
  });
  await worker.run();
}

main().catch(console.error);
