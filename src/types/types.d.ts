import { RequestGenericInterface } from 'fastify'
import { FromSchema } from 'json-schema-to-ts'
import { bucketSchema } from '../schemas/bucket'
import { objectSchema } from '../schemas/object'

export type Bucket = FromSchema<typeof bucketSchema>
export type Obj = FromSchema<typeof objectSchema>

export type SignedToken = {
  url: string
}

export interface AuthenticatedRequest extends RequestGenericInterface {
  Headers: {
    authorization: string
  }
}
type PostgrestError = {
  message: string
  details: string
  hint: string
  code: string
}

type StorageError = {
  statusCode: string
  error: string
  message: string
}

type ObjectMetadata = {
  cacheControl?: string
  size?: number
  mimetype?: string
}
