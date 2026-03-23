import { Worker } from '@temporalio/worker';
import { parseActivity } from '../activities/parse';
import { dedupActivity } from '../activities/dedup';
import { classifyActivity } from '../activities/classify';

async function main() {
  const worker = await Worker.create({
    workflowsPath: require.resolve('../workflows/source-ingestion'),
    activities: { parseActivity, dedupActivity, classifyActivity },
    taskQueue: 'parse-structured',
    maxConcurrentActivityTaskExecutions: 100,
  });
  await worker.run();
}

main().catch(console.error);
