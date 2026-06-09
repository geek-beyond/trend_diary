// RDBクライアントのモックは datastore に集約し、再利用する。
export {
  default,
  getRdbClientMock,
  mockRdbClient,
  mockRdbExecutor,
} from '@trend-diary/datastore/test-helper/rdb'
