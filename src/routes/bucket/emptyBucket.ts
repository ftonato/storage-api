import { FastifyInstance } from 'fastify'
import { FromSchema } from 'json-schema-to-ts'
import { AuthenticatedRequest, Bucket, Obj } from '../../types/types'
import { getPostgrestClient, transformPostgrestError } from '../../utils'
import { getConfig } from '../../utils/config'
import { createDefaultSchema, createResponse } from '../../utils/generic-routes'
import { deleteObjects, initClient } from '../../utils/s3'

const { region, projectRef, globalS3Bucket, globalS3Endpoint } = getConfig()
const client = initClient(region, globalS3Endpoint)

const emptyBucketParamsSchema = {
  type: 'object',
  properties: {
    bucketId: { type: 'string', example: 'avatars' },
  },
  required: ['bucketId'],
} as const
const successResponseSchema = {
  type: 'object',
  properties: {
    message: { type: 'string', example: 'Successfully emptied' },
  },
}
interface emptyBucketRequestInterface extends AuthenticatedRequest {
  Params: FromSchema<typeof emptyBucketParamsSchema>
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default async function routes(fastify: FastifyInstance) {
  const summary = 'Empty a bucket'
  const schema = createDefaultSchema(successResponseSchema, {
    params: emptyBucketParamsSchema,
    summary,
    tags: ['bucket'],
  })
  fastify.post<emptyBucketRequestInterface>(
    '/:bucketId/empty',
    {
      schema,
    },
    async (request, response) => {
      const authHeader = request.headers.authorization
      const jwt = authHeader.substring('Bearer '.length)
      const { bucketId } = request.params
      const postgrest = getPostgrestClient(jwt)

      const bucketResponse = await postgrest
        .from<Bucket>('buckets')
        .select('name')
        .eq('id', bucketId)
        .single()

      if (bucketResponse.error) {
        const { status, error } = bucketResponse
        return response.status(400).send(transformPostgrestError(error, status))
      }
      const { data: bucket } = bucketResponse
      const bucketName = bucket.name

      let deleteError, objectError, objects, objectStatus
      do {
        ;({ data: objects, error: objectError, status: objectStatus } = await postgrest
          .from<Obj>('objects')
          .select('name, id')
          .eq('bucket_id', bucketId)
          .limit(500))

        if (objectError) {
          request.log.error({ error: objectError }, 'error object')
          return response.status(400).send(transformPostgrestError(objectError, objectStatus))
        }
        request.log.info({ results: objects }, 'results')

        if (objects && objects.length > 0) {
          const params = objects.map((ele) => {
            return {
              Key: `${projectRef}/${bucketName}/${ele.name}`,
            }
          })
          // delete files from s3 asynchronously
          deleteObjects(client, globalS3Bucket, params)
          ;({ error: deleteError } = await postgrest
            .from<Obj>('objects')
            .delete()
            .in(
              'id',
              objects.map((ele) => ele.id)
            ))

          if (deleteError) {
            request.log.error({ error: deleteError }, 'error bucket')
          }
        }
      } while (!deleteError && !objectError && objects && objects.length > 0)

      return response.status(200).send(createResponse('Successfully emptied'))
    }
  )
}
