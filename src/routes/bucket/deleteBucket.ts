import { FastifyInstance } from 'fastify'
import { FromSchema } from 'json-schema-to-ts'
import { AuthenticatedRequest, Bucket, Obj } from '../../types/types'
import { getPostgrestClient, transformPostgrestError } from '../../utils'
import { getConfig } from '../../utils/config'
import { createDefaultSchema, createResponse } from '../../utils/generic-routes'

const { serviceKey } = getConfig()

const deleteBucketParamsSchema = {
  type: 'object',
  properties: {
    bucketId: { type: 'string', example: 'avatars' },
  },
  required: ['bucketId'],
} as const
const successResponseSchema = {
  type: 'object',
  properties: {
    message: { type: 'string', example: 'Successfully deleted' },
  },
}
interface deleteBucketRequestInterface extends AuthenticatedRequest {
  Params: FromSchema<typeof deleteBucketParamsSchema>
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default async function routes(fastify: FastifyInstance) {
  const summary = 'Delete a bucket'
  const schema = createDefaultSchema(successResponseSchema, {
    params: deleteBucketParamsSchema,
    summary,
    tags: ['bucket'],
  })
  fastify.delete<deleteBucketRequestInterface>(
    '/:bucketId',
    {
      schema,
    },
    async (request, response) => {
      const authHeader = request.headers.authorization
      const jwt = authHeader.substring('Bearer '.length)
      const { bucketId } = request.params
      const userPostgrest = getPostgrestClient(jwt)
      const superUserPostgrest = getPostgrestClient(serviceKey)

      const {
        data: bucketResults,
        error: bucketError,
        status: bucketStatus,
      } = await userPostgrest.from<Bucket>('buckets').select('id').eq('id', bucketId).single()

      if (bucketError) {
        request.log.error({ error: bucketError }, 'error bucket')
        return response.status(400).send(transformPostgrestError(bucketError, bucketStatus))
      }
      request.log.info({ results: bucketResults }, 'results')

      const {
        count: objectCount,
        error: objectError,
        status: objectStatus,
      } = await superUserPostgrest
        .from<Obj>('objects')
        .select('id', { count: 'exact' })
        .eq('bucket_id', bucketId)
        .limit(10)

      if (objectError) {
        request.log.error({ error: objectError }, 'error object')
        return response.status(400).send(transformPostgrestError(objectError, objectStatus))
      }

      request.log.info('bucket has %s objects', objectCount)
      if (objectCount && objectCount > 0) {
        return response
          .status(400)
          .send(
            createResponse(
              'Bucket must be empty before you can delete it',
              '400',
              'Bucket not empty'
            )
          )
      }

      const { data: results, error, status } = await userPostgrest
        .from<Bucket>('buckets')
        .delete()
        .eq('id', bucketId)
      if (error) {
        request.log.error({ error }, 'error bucket')
        return response.status(400).send(transformPostgrestError(error, status))
      }
      request.log.info({ results }, 'results')
      return response.status(200).send(createResponse('Successfully deleted'))
    }
  )
}
