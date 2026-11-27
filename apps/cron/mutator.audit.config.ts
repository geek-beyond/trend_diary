import audit from '../../mutator.audit.config'
import cron from './mutator.config'

export default { ...audit, ...cron, concurrency: 1 }
