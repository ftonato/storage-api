import { FastifyInstance } from 'fastify'
import copyObject from './copyObject'
import createObject from './createObject'
import deleteObject from './deleteObject'
import deleteObjects from './deleteObjects'
import getObject from './getObject'
import getSignedObject from './getSignedObject'
import getSignedURL from './getSignedURL'
import listObjects from './listObjects'
import moveObject from './moveObject'
import updateObject from './updateObject'

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default async function routes(fastify: FastifyInstance) {
  copyObject(fastify)
  createObject(fastify)
  deleteObject(fastify)
  deleteObjects(fastify)
  getObject(fastify)
  getSignedObject(fastify)
  getSignedURL(fastify)
  moveObject(fastify)
  updateObject(fastify)
  listObjects(fastify)
}
