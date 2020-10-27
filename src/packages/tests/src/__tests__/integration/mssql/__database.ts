const sql = require('mssql')
const url = require('url')

import { Context, Input } from '../../__helpers__/integrationTest'

export const database = {
  name: 'sqlserver',
  datasource: {
    url: ctx => getConnectionInfo(ctx).connectionString,
  },
  previewFeatures: ["microsoftSqlServer"],
  connect: ctx => {
    const credentials = getConnectionInfo(ctx).credentials
    const pool = new sql.ConnectionPool(credentials) // always connect to master to create the db
    return pool.connect()
  },
  create: async (pool, sqlUp) => {
    await pool.request().query(sqlUp) // create database from master
    pool.close()
  },
  send: async (pool, sqlScenario, ctx) => {
    const credentials = getConnectionInfo(ctx).credentials
    const credentialsClone = {...credentials, database: `master_${ctx.id}`, }
    const newPool = new sql.ConnectionPool(credentialsClone)
    await newPool.connect() // connect to newly created db to execute scenario SQL then close
    await newPool.request().query(sqlScenario)
    newPool.close()
  },
  close: pool => pool.close(),
  up: ctx => {
    return `
    DROP DATABASE IF EXISTS master_${ctx.id};
    CREATE DATABASE master_${ctx.id};`
  },
} as Input['database']

function getConnectionInfo(ctx: Context) {
  const { URL } = url
  const serviceConnectionString =
    process.env.TEST_MSSQL_URI ||
    'mssql://SA:Pr1sm4_Pr1sm4@localhost:1433/master'
  const connectionUrl = new URL(serviceConnectionString)
  const connectionString = `sqlserver://${connectionUrl.host};database=master_${ctx.id};user=SA;password=Pr1sm4_Pr1sm4;trustServerCertificate=true;encrypt=DANGER_PLAINTEXT`
  const credentials = {
    user: 'SA',
    password: 'Pr1sm4_Pr1sm4',
    server: connectionUrl.hostname,
    port: Number(connectionUrl.port),
    database: `master`,
    pool: {
      max: 1,
    },
    options: {
      enableArithAbort: false,
    },
  }
  return { credentials, connectionString }
}
