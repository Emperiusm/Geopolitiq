import { Worker } from '@temporalio/worker';
import { parseActivity } from '../activities/parse';

async function main() {
  const worker = await Worker.create({
    workflowsPath: require.resolve('../workflows/source-ingestion'),
    activities: { parseActivity },
    taskQueue: 'parse-agent',
    maxConcurrentActivityTaskExecutions: 10,
  });
  await worker.run();
}

main().catch(console.error);
