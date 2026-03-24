import { Worker } from '@temporalio/worker';
import {
  getSourceConfig,
  createPipelineRun,
  completePipelineRun,
  updateFetchState,
  dlqSignalActivity,
  writeSignalActivity,
} from '../activities/system';

async function main() {
  const worker = await Worker.create({
    workflowsPath: require.resolve('../workflows/source-ingestion'),
    activities: {
      getSourceConfig,
      createPipelineRun,
      completePipelineRun,
      updateFetchState,
      dlqSignalActivity,
      writeSignalActivity,
    },
    taskQueue: 'system',
    maxConcurrentActivityTaskExecutions: 5,
  });
  await worker.run();
}

main().catch(console.error);
